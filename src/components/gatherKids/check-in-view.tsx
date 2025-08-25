

'use client';

"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Child, Guardian, Attendance, Household, EmergencyContact, Incident } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getTodayIsoDate, recordCheckIn, recordCheckOut } from '@/lib/dal';
import type { StatusFilter } from '@/app/dashboard/check-in/page';
import { IncidentDetailsDialog } from './incident-details-dialog';
import { PhotoCaptureDialog } from './photo-capture-dialog';
import { PhotoViewerDialog } from './photo-viewer-dialog';
import { parseISO, differenceInYears } from 'date-fns';
import { ChildCard } from './child-card';
import { CheckoutDialog } from './checkout-dialog';


interface CheckInViewProps {
  initialChildren: Child[];
  selectedEvent: string;
  selectedGrades: string[];
  statusFilter: StatusFilter;
}

const eventNames: { [key: string]: string } = {
  'evt_sunday_school': 'Sunday School',
  'evt_childrens_church': "Children's Church",
  'evt_teen_church': 'Teen Church',
  'min_choir_kids': "Children's Choir Practice",
  'min_youth_group': 'Youth Group',
};

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    return eventNames[eventId] || 'an event';
}

export interface EnrichedChild extends Child {
    activeAttendance: Attendance | null;
    guardians: Guardian[];
    household: Household | null;
    emergencyContact: EmergencyContact | null;
    incidents: Incident[];
    age: number | null;
}

export function CheckInView({ initialChildren, selectedEvent, selectedGrades, statusFilter }: CheckInViewProps) {
  const [children, setChildren] = useState<EnrichedChild[]>([]);
  const [childToCheckout, setChildToCheckout] = useState<EnrichedChild | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[] | null>(null);
  const [selectedChildForPhoto, setSelectedChildForPhoto] = useState<Child | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{name: string, url: string} | null>(null);


  const today = getTodayIsoDate();
  const todaysAttendance = useLiveQuery(() => db.attendance.where({date: today}).toArray(), [today]);
  
  const todaysIncidents = useLiveQuery(() => 
    db.incidents.filter(i => i.timestamp.startsWith(today)).toArray()
  , [today]);

  useEffect(() => {
    const enrichChildren = async () => {
        if(!todaysAttendance || !todaysIncidents) return;

        const attendanceByChild = new Map<string, Attendance[]>();
        todaysAttendance.forEach(a => {
            if (!attendanceByChild.has(a.child_id)) {
                attendanceByChild.set(a.child_id, []);
            }
            attendanceByChild.get(a.child_id)!.push(a);
        });

        const incidentsByChild = new Map<string, Incident[]>();
        todaysIncidents.forEach(i => {
            if (!incidentsByChild.has(i.child_id)) {
                incidentsByChild.set(i.child_id, []);
            }
            incidentsByChild.get(i.child_id)!.push(i);
        });

        const householdIds = initialChildren.map(c => c.household_id);
        const allGuardians = await db.guardians.where('household_id').anyOf(householdIds).toArray();
        const allHouseholds = await db.households.where('household_id').anyOf(householdIds).toArray();
        const allEmergencyContacts = await db.emergency_contacts.where('household_id').anyOf(householdIds).toArray();

        const guardianMap = new Map<string, Guardian[]>();
        allGuardians.forEach(g => {
            if (!guardianMap.has(g.household_id)) {
                guardianMap.set(g.household_id, []);
            }
            guardianMap.get(g.household_id)!.push(g);
        });
        
        const householdMap = new Map<string, Household>();
        allHouseholds.forEach(h => {
            householdMap.set(h.household_id, h);
        });

        const emergencyContactMap = new Map<string, EmergencyContact>();
        allEmergencyContacts.forEach(ec => {
            emergencyContactMap.set(ec.household_id, ec);
        });


        const enriched = initialChildren.map(c => {
            const childAttendance = attendanceByChild.get(c.child_id) || [];
            // Find the most recent check-in that has not been checked out yet.
            const activeAttendance = childAttendance
                .filter(a => !a.check_out_at)
                .sort((a, b) => new Date(b.check_in_at!).getTime() - new Date(a.check_in_at!).getTime())
                [0] || null;

            const childIncidents = (incidentsByChild.get(c.child_id) || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return {
                ...c,
                activeAttendance: activeAttendance,
                guardians: guardianMap.get(c.household_id) || [],
                household: householdMap.get(c.household_id) || null,
                emergencyContact: emergencyContactMap.get(c.household_id) || null,
                incidents: childIncidents,
                age: c.dob ? differenceInYears(new Date(), parseISO(c.dob)) : null,
            }
        });
        setChildren(enriched);
    }
    enrichChildren();
  }, [initialChildren, todaysAttendance, todaysIncidents]);

  const handleCheckIn = async (childId: string) => {
    try {
      await recordCheckIn(childId, selectedEvent, undefined, 'user_admin');
      const child = children.find(c => c.child_id === childId);
      toast({
        title: 'Checked In',
        description: `${child?.first_name} ${child?.last_name} has been checked in to ${getEventName(selectedEvent)}.`,
      });
    } catch(e: any) {
      console.error(e);
      toast({
        title: 'Check-in Failed',
        description: e.message || 'Could not check in the child. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckout = async (childId: string, attendanceId: string, verifier: { method: 'PIN' | 'other', value: string }) => {
    try {
        await recordCheckOut(attendanceId, verifier);
        const child = children.find(c => c.child_id === childId);
        // Find the original event name from the attendance record before it gets cleared
        const todaysRecord = todaysAttendance?.find(a => a.attendance_id === attendanceId);
        const eventName = getEventName(todaysRecord?.event_id || null);
        toast({
            title: 'Checked Out',
            description: `${child?.first_name} ${child?.last_name} has been checked out from ${eventName}.`,
        });
    } catch (e) {
        console.error(e);
        toast({
            title: 'Check-out Failed',
            description: 'Could not check out the child. Please try again.',
            variant: 'destructive',
        });
    }
  };
  
  const openCheckoutDialog = (child: EnrichedChild) => {
    setChildToCheckout(child);
  };

  const closeCheckoutDialog = () => {
    setChildToCheckout(null);
  };

  const filteredChildren = useMemo(() => {
    let results = children;

    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        results = results.filter(child =>
            child.first_name.toLowerCase().includes(lowercasedQuery) ||
            child.last_name.toLowerCase().includes(lowercasedQuery) ||
            (child.household?.name && child.household.name.toLowerCase().includes(lowercasedQuery))
        );
    }

    if (selectedGrades.length > 0) {
        results = results.filter(child => child.grade && selectedGrades.includes(child.grade));
    }

    if (statusFilter !== 'all') {
        if (statusFilter === 'checkedIn') {
            results = results.filter(child => child.activeAttendance !== null);
        } else { // 'checkedOut'
            results = results.filter(child => child.activeAttendance === null);
        }
    }

    return results;
  }, [searchQuery, children, selectedGrades, statusFilter]);

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name or family name (e.g. Jackson)..."
          className="w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredChildren.map((child) => (
            <ChildCard
                key={child.child_id}
                child={child}
                selectedEvent={selectedEvent}
                onCheckIn={handleCheckIn}
                onCheckout={openCheckoutDialog}
                onViewIncidents={setSelectedIncidents}
                onUpdatePhoto={setSelectedChildForPhoto}
                onViewPhoto={setViewingPhoto}
            />
        ))}
      </div>
       {filteredChildren.length === 0 && (
        <div className="text-center col-span-full py-12">
            <p className="text-muted-foreground">No children found matching your search or filters.</p>
        </div>
       )}
      <CheckoutDialog
        child={childToCheckout}
        onClose={closeCheckoutDialog}
        onCheckout={handleCheckout}
      />
      <IncidentDetailsDialog
        incidents={selectedIncidents}
        onClose={() => setSelectedIncidents(null)}
       />
        <PhotoCaptureDialog
            child={selectedChildForPhoto}
            onClose={() => setSelectedChildForPhoto(null)}
        />
        <PhotoViewerDialog
            photo={viewingPhoto}
            onClose={() => setViewingPhoto(null)}
        />
    </>
  );
}
