
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Child, Guardian, Attendance, Household, EmergencyContact } from '@/lib/types';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Search, Info, Cake, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isWithinInterval, subDays, addDays, setYear, parseISO, differenceInYears } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getTodayIsoDate, recordCheckIn, recordCheckOut } from '@/lib/dal';
import { Separator } from '../ui/separator';

interface CheckInViewProps {
  initialChildren: Child[];
  selectedEvent: string;
}

const isBirthdayThisWeek = (dob?: string): boolean => {
    if (!dob) return false;
    try {
        const today = new Date();
        const birthDate = parseISO(dob);
        
        const currentYearBirthday = setYear(birthDate, today.getFullYear());

        const sevenDaysAgo = subDays(today, 7);
        const sevenDaysFromNow = addDays(today, 7);
        
        if (isWithinInterval(currentYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
            return true;
        }

        const nextYearBirthday = addYears(currentYearBirthday, 1);
        if (isWithinInterval(nextYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
            return true;
        }
        const prevYearBirthday = subYears(currentYearBirthday, 1);
        if (isWithinInterval(prevYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
            return true;
        }
    } catch(e) {
        return false;
    }

    return false;
}

const addYears = (date: Date, years: number) => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + years);
    return newDate;
}
const subYears = (date: Date, years: number) => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() - years);
    return newDate;
}

const eventNames: { [key: string]: string } = {
  'evt_sunday_school': 'Sunday School',
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
}

export function CheckInView({ initialChildren, selectedEvent }: CheckInViewProps) {
  const [children, setChildren] = useState<EnrichedChild[]>([]);
  const [childToCheckout, setChildToCheckout] = useState<EnrichedChild | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const today = getTodayIsoDate();
  const todaysAttendance = useLiveQuery(() => db.attendance.where({date: today}).toArray(), [today]);

  useEffect(() => {
    const enrichChildren = async () => {
        if(!todaysAttendance) return;

        const attendanceByChild = new Map<string, Attendance[]>();
        todaysAttendance.forEach(a => {
            if (!attendanceByChild.has(a.child_id)) {
                attendanceByChild.set(a.child_id, []);
            }
            attendanceByChild.get(a.child_id)!.push(a);
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

            return {
                ...c,
                activeAttendance: activeAttendance,
                guardians: guardianMap.get(c.household_id) || [],
                household: householdMap.get(c.household_id) || null,
                emergencyContact: emergencyContactMap.get(c.household_id) || null,
            }
        });
        setChildren(enriched);
    }
    enrichChildren();
  }, [initialChildren, todaysAttendance]);

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

  const handleCheckout = async (childId: string, attendanceId: string) => {
    try {
        await recordCheckOut(attendanceId, {method: 'PIN', value: '----'}); // Pin is verified in dialog
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
    if (!searchQuery) {
      return children;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return children.filter(child =>
        child.first_name.toLowerCase().includes(lowercasedQuery) ||
        child.last_name.toLowerCase().includes(lowercasedQuery) ||
        (child.household?.name && child.household.name.toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, children]);

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
        {filteredChildren.map((child) => {
            const checkedInEvent = child.activeAttendance?.event_id;
            const isCheckedInHere = checkedInEvent === selectedEvent;
            const isCheckedInElsewhere = checkedInEvent && checkedInEvent !== selectedEvent;

            return (
              <Card key={child.child_id} className="relative flex flex-col overflow-hidden">
                {isBirthdayThisWeek(child.dob) && (
                    <div className="bg-orange-400 text-white text-center py-1 px-2 text-sm font-semibold flex items-center justify-center gap-2">
                        <Cake className="h-4 w-4" />
                        Birthday This Week!
                    </div>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 shrink-0 z-10">
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold font-headline mb-2">Guardians</h4>
                        <div className="space-y-3">
                            {child.guardians?.map(g => (
                                <div key={g.guardian_id} className="text-sm">
                                <p className="font-medium">{g.first_name} {g.last_name} ({g.relationship})</p>
                                <p className="text-muted-foreground">{g.mobile_phone}</p>
                                </div>
                            ))}
                            {!child.guardians?.length && (
                                <p className="text-sm text-muted-foreground">No guardian information available.</p>
                            )}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold font-headline mb-2">Emergency Contact</h4>
                        {child.emergencyContact ? (
                             <div className="text-sm">
                                <p className="font-medium">{child.emergencyContact.first_name} {child.emergencyContact.last_name} ({child.emergencyContact.relationship})</p>
                                <p className="text-muted-foreground">{child.emergencyContact.mobile_phone}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No emergency contact available.</p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <CardHeader className="flex flex-col items-center gap-4 p-4 pt-6 text-center sm:flex-row sm:items-start sm:p-6 sm:text-left">
                   <div className="w-[60px] h-[60px] flex-shrink-0 flex items-center justify-center rounded-full border-2 border-border bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                   </div>
                  <div className="flex-1">
                    <CardTitle className="font-headline text-lg">{`${child.first_name} ${child.last_name}`}</CardTitle>
                    <CardDescription>
                      {child.household?.name || '...'}
                    </CardDescription>
                     <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                        {isCheckedInHere && (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                        )}
                        {isCheckedInElsewhere && (
                            <Badge variant="secondary">In {getEventName(checkedInEvent)}</Badge>
                        )}
                        {!checkedInEvent && (
                            <Badge variant="secondary">Checked Out</Badge>
                        )}
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-2 px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>DOB:</strong> {child.dob ? format(parseISO(child.dob), "MMM d, yyyy") : 'N/A'} ({child.dob ? differenceInYears(new Date(), parseISO(child.dob)) : ''} yrs)</p>
                    <p><strong>Grade:</strong> {child.grade}</p>
                    {child.medical_notes && <p><strong>Notes:</strong> {child.medical_notes}</p>}
                  </div>
                  {child.allergies && (
                      <Badge variant="outline" className="w-full justify-center text-base py-1 border-destructive text-destructive rounded-sm">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Allergy: {child.allergies}
                      </Badge>
                  )}
                </CardContent>
                <CardFooter className="px-4 pb-4 sm:px-6 sm:pb-6">
                  {isCheckedInHere ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => openCheckoutDialog(child)}
                    >
                      Check Out
                    </Button>
                  ) : (
                    <Button 
                        className="w-full"
                        onClick={() => handleCheckIn(child.child_id)}
                        disabled={!!checkedInEvent}
                    >
                      Check In
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
        })}
      </div>
       {filteredChildren.length === 0 && (
        <div className="text-center col-span-full py-12">
            <p className="text-muted-foreground">No children found matching your search.</p>
        </div>
       )}
      <CheckoutDialog
        child={childToCheckout}
        onClose={closeCheckoutDialog}
        onCheckout={handleCheckout}
      />
    </>
  );
}
