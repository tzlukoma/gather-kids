

"use client"

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { getTodayIsoDate, recordCheckIn, recordCheckOut } from "@/lib/dal";
import { useMemo, useState } from "react";
import type { Child, Guardian, Attendance, Household, EmergencyContact } from "@/lib/types";
import { CheckoutDialog } from "@/components/ministrysync/checkout-dialog";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedChild } from "@/components/ministrysync/check-in-view";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface RosterChild extends EnrichedChild {}

type SortDirection = "asc" | "desc" | "none";

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    const eventNames: { [key: string]: string } = {
      'evt_sunday_school': 'Sunday School',
      'min_choir_kids': "Children's Choir Practice",
      'min_youth_group': 'Youth Group',
    };
    return eventNames[eventId] || 'an event';
}

const gradeSortOrder: { [key: string]: number } = {
    "Pre-K": 0,
    "K": 1,
    "1st Grade": 2,
    "2nd Grade": 3,
    "3rd Grade": 4,
    "4th Grade": 5,
    "5th Grade": 6,
    "6th Grade": 7,
    "7th Grade": 8,
    "8th Grade": 9,
    "9th Grade": 10,
    "10th Grade": 11,
    "11th Grade": 12,
    "12th Grade": 13,
};

const getGradeValue = (grade?: string): number => {
    if (!grade) return 99;
    const value = gradeSortOrder[grade];
    return value !== undefined ? value : 99;
};


export default function RostersPage() {
  const today = getTodayIsoDate();
  const { toast } = useToast();

  const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
  const [childToCheckout, setChildToCheckout] = useState<RosterChild | null>(null);
  const [showOnlyCheckedIn, setShowOnlyCheckedIn] = useState(false);
  const [gradeSort, setGradeSort] = useState<SortDirection>("none");

  const allChildren = useLiveQuery(() => db.children.toArray(), []);
  const todaysAttendance = useLiveQuery(() => db.attendance.where({ date: today }).toArray(), [today]);
  
  const allGuardians = useLiveQuery(() => db.guardians.toArray(), []);
  const allHouseholds = useLiveQuery(() => db.households.toArray(), []);
  const allEmergencyContacts = useLiveQuery(() => db.emergency_contacts.toArray(), []);

  const childrenWithDetails: RosterChild[] = useMemo(() => {
    if (!allChildren || !todaysAttendance || !allGuardians || !allHouseholds || !allEmergencyContacts) return [];

    const activeAttendance = todaysAttendance.filter(a => !a.check_out_at);
    const attendanceMap = new Map(activeAttendance.map(a => [a.child_id, a]));
    const guardianMap = new Map<string, Guardian[]>();
    allGuardians.forEach(g => {
        if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
        guardianMap.get(g.household_id)!.push(g);
    });
    const householdMap = new Map(allHouseholds.map(h => [h.household_id, h]));
    const emergencyContactMap = new Map(allEmergencyContacts.map(ec => [ec.household_id, ec]));

    return allChildren.map(child => ({
      ...child,
      activeAttendance: attendanceMap.get(child.child_id) || null,
      guardians: guardianMap.get(child.household_id) || [],
      household: householdMap.get(child.household_id) || null,
      emergencyContact: emergencyContactMap.get(child.household_id) || null,
    }));
  }, [allChildren, todaysAttendance, allGuardians, allHouseholds, allEmergencyContacts]);

  const displayChildren = useMemo(() => {
    let filtered = childrenWithDetails;

    if (showOnlyCheckedIn) {
        filtered = filtered.filter(child => child.activeAttendance);
    }
    
    if (gradeSort !== 'none') {
        filtered.sort((a, b) => {
            const aVal = getGradeValue(a.grade);
            const bVal = getGradeValue(b.grade);
            if (gradeSort === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });
    }

    return filtered;
  }, [childrenWithDetails, showOnlyCheckedIn, gradeSort])


  const handleCheckIn = async (child: RosterChild) => {
    try {
      await recordCheckIn(child.child_id, selectedEvent, undefined, 'user_admin');
      toast({
        title: 'Checked In',
        description: `${child.first_name} ${child.last_name} has been checked in to ${getEventName(selectedEvent)}.`,
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
        const child = childrenWithDetails.find(c => c.child_id === childId);
        const eventName = getEventName(child?.activeAttendance?.event_id || null);
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

  const toggleGradeSort = () => {
    if (gradeSort === 'none') setGradeSort('asc');
    else if (gradeSort === 'asc') setGradeSort('desc');
    else setGradeSort('none');
  };

  if (!childrenWithDetails) {
    return <div>Loading rosters...</div>
  }

  return (
    <>
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Class Rosters</h1>
          <p className="text-muted-foreground">
            View real-time rosters for all classes and manage attendance.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="event-select">Check-In Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger id="event-select" className="w-full sm:w-[250px]">
                      <SelectValue placeholder="Select an event..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="evt_sunday_school">Sunday School</SelectItem>
                      <SelectItem value="min_choir_kids">Children's Choir Practice</SelectItem>
                      <SelectItem value="min_youth_group">Youth Group</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">All Children</CardTitle>
                <CardDescription>A complete list of all children registered.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                    <Switch id="show-checked-in" checked={showOnlyCheckedIn} onCheckedChange={setShowOnlyCheckedIn} />
                    <Label htmlFor="show-checked-in">Show Only Checked-In</Label>
                </div>
                <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={toggleGradeSort} className="px-1">
                        Grade
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-In Time</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayChildren.map((child) => (
                <TableRow key={child.child_id}>
                  <TableCell className="font-medium">{`${child.first_name} ${child.last_name}`}</TableCell>
                  <TableCell>{child.grade}</TableCell>
                  <TableCell>
                    {child.activeAttendance ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                    ) : (
                      <Badge variant="secondary">Checked Out</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {child.activeAttendance?.check_in_at ? format(new Date(child.activeAttendance.check_in_at), "p") : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {child.allergies && (
                      <Badge variant="destructive">Allergy</Badge>
                    )}
                  </TableCell>
                   <TableCell className="w-[120px]">
                    {child.activeAttendance ? (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setChildToCheckout(child)}>Check Out</Button>
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => handleCheckIn(child)}>Check In</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {displayChildren.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        {showOnlyCheckedIn ? "No children are currently checked in." : "No children found."}
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
     <CheckoutDialog
        child={childToCheckout}
        onClose={() => setChildToCheckout(null)}
        onCheckout={handleCheckout}
      />
    </>
  );
}
