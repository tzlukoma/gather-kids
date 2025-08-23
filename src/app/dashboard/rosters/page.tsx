
"use client"
import React from 'react';
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
import { useMemo, useState, useEffect } from "react";
import type { Child, Guardian, Attendance, Household, EmergencyContact, Ministry } from "@/lib/types";
import { CheckoutDialog } from "@/components/ministrysync/checkout-dialog";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedChild } from "@/components/ministrysync/check-in-view";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from '@/hooks/use-mobile';
import { RosterCard } from '@/components/ministrysync/roster-card';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export interface RosterChild extends EnrichedChild {}

type SortDirection = "asc" | "desc" | "none";

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    const eventNames: { [key: string]: string } = {
      'evt_sunday_school': 'Sunday School',
      'evt_childrens_church': "Children's Church",
      'evt_teen_church': 'Teen Church',
      'min_choir_kids': "Children's Choir Practice",
      'min_youth_group': 'Youth Group',
    };
    return eventNames[eventId] || 'an event';
}

const gradeSortOrder: { [key: string]: number } = {
    "Pre-K": 0, "Kindergarten": 1, "1st Grade": 2, "2nd Grade": 3, "3rd Grade": 4, "4th Grade": 5, "5th Grade": 6, "6th Grade": 7, "7th Grade": 8, "8th Grade": 9, "9th Grade": 10, "10th Grade": 11, "11th Grade": 12, "12th Grade": 13,
};

const getGradeValue = (grade?: string): number => {
    if (!grade) return 99;
    const value = gradeSortOrder[grade];
    return value !== undefined ? value : 99;
};


export default function RostersPage() {
  const today = getTodayIsoDate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
  const [childToCheckout, setChildToCheckout] = useState<RosterChild | null>(null);
  
  const [showCheckedIn, setShowCheckedIn] = useState(false);
  const [showCheckedOut, setShowCheckedOut] = useState(false);
  const [groupByGrade, setGroupByGrade] = useState(false);

  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());

  const [gradeSort, setGradeSort] = useState<SortDirection>("asc");
  const [selectedMinistryFilter, setSelectedMinistryFilter] = useState<string>('all');

  const allMinistryEnrollments = useLiveQuery(() => db.ministry_enrollments.where({ cycle_id: '2025' }).toArray(), []);

  const allChildrenQuery = useLiveQuery(async () => {
    if (user?.role === 'leader') {
        if (!user.assignedMinistryIds || user.assignedMinistryIds.length === 0) return [];
        const enrollments = await db.ministry_enrollments
            .where('ministry_id').anyOf(user.assignedMinistryIds)
            .and(e => e.cycle_id === '2025')
            .toArray();
        const childIds = [...new Set(enrollments.map(e => e.child_id))];
        if (childIds.length === 0) return [];
        return db.children.where('child_id').anyOf(childIds).toArray();
    }
    return db.children.toArray();
  }, [user]);

  const todaysAttendance = useLiveQuery(() => db.attendance.where({ date: today }).toArray(), [today]);
  
  const allGuardians = useLiveQuery(() => db.guardians.toArray(), []);
  const allHouseholds = useLiveQuery(() => db.households.toArray(), []);
  const allEmergencyContacts = useLiveQuery(() => db.emergency_contacts.toArray(), []);
  const allMinistries = useLiveQuery(() => db.ministries.toArray(), []);

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'checkedIn') {
        setShowCheckedIn(true);
        setShowCheckedOut(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.role === 'leader' && user.assignedMinistryIds?.length === 1) {
        setSelectedMinistryFilter(user.assignedMinistryIds[0]);
    }
  }, [user]);


  const childrenWithDetails: RosterChild[] = useMemo(() => {
    if (!allChildrenQuery || !todaysAttendance || !allGuardians || !allHouseholds || !allEmergencyContacts) return [];

    const activeAttendance = todaysAttendance.filter(a => !a.check_out_at);
    const attendanceMap = new Map(activeAttendance.map(a => [a.child_id, a]));
    const guardianMap = new Map<string, Guardian[]>();
    allGuardians.forEach(g => {
        if (!guardianMap.has(g.household_id)) guardianMap.set(g.household_id, []);
        guardianMap.get(g.household_id)!.push(g);
    });
    const householdMap = new Map(allHouseholds.map(h => [h.household_id, h]));
    const emergencyContactMap = new Map(allEmergencyContacts.map(ec => [ec.household_id, ec]));

    return allChildrenQuery.map(child => ({
      ...child,
      activeAttendance: attendanceMap.get(child.child_id) || null,
      guardians: guardianMap.get(child.household_id) || [],
      household: householdMap.get(child.household_id) || null,
      emergencyContact: emergencyContactMap.get(child.household_id) || null,
    }));
  }, [allChildrenQuery, todaysAttendance, allGuardians, allHouseholds, allEmergencyContacts]);

  const ministryFilterOptions = useMemo(() => {
        if (!allChildrenQuery || !allMinistryEnrollments || !allMinistries) return [];
        
        let relevantMinistryIds: Set<string>;

        if (user?.role === 'leader' && user.assignedMinistryIds) {
            relevantMinistryIds = new Set(user.assignedMinistryIds);
        } else {
             const childIdsInView = new Set(allChildrenQuery.map(c => c.child_id));
             relevantMinistryIds = new Set(
                allMinistryEnrollments
                    .filter(e => childIdsInView.has(e.child_id))
                    .map(e => e.ministry_id)
            );
        }

        return allMinistries
            .filter(m => relevantMinistryIds.has(m.ministry_id))
            .sort((a,b) => a.name.localeCompare(b.name));

    }, [allChildrenQuery, allMinistryEnrollments, allMinistries, user]);


  const displayChildren = useMemo(() => {
    let filtered = childrenWithDetails;

    if (selectedMinistryFilter !== 'all' && allMinistryEnrollments) {
        const childrenInMinistry = new Set(
            allMinistryEnrollments
                .filter(e => e.ministry_id === selectedMinistryFilter)
                .map(e => e.child_id)
        );
        filtered = filtered.filter(c => childrenInMinistry.has(c.child_id));
    }


    const isFiltered = showCheckedIn !== showCheckedOut;
    if (isFiltered) {
        if (showCheckedIn) {
             filtered = filtered.filter(child => child.activeAttendance);
        } else { // showCheckedOut
            filtered = filtered.filter(child => !child.activeAttendance);
        }
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
  }, [childrenWithDetails, showCheckedIn, showCheckedOut, gradeSort, selectedMinistryFilter, allMinistryEnrollments])
  
  const groupedChildren = useMemo(() => {
    if (!groupByGrade) return null;
    return displayChildren.reduce((acc, child) => {
        const grade = child.grade || 'Ungraded';
        if (!acc[grade]) {
            acc[grade] = [];
        }
        acc[grade].push(child);
        return acc;
    }, {} as Record<string, RosterChild[]>);
  }, [displayChildren, groupByGrade]);


  const handleBulkAction = async () => {
    const promises = [];
    const childrenToUpdate = Array.from(selectedChildren);
    
    if (showCheckedOut) { // Bulk Check-In
        for (const childId of childrenToUpdate) {
            promises.push(recordCheckIn(childId, selectedEvent, undefined, 'user_admin_bulk'));
        }
        await Promise.all(promises);
        toast({ title: "Bulk Check-In Complete", description: `${childrenToUpdate.length} children checked in.` });
    } else if (showCheckedIn) { // Bulk Check-Out
        for (const childId of childrenToUpdate) {
            const child = displayChildren.find(c => c.child_id === childId);
            if (child?.activeAttendance) {
                 promises.push(recordCheckOut(child.activeAttendance.attendance_id, { method: 'other', value: 'Admin Bulk Checkout' }, 'user_admin_bulk'));
            }
        }
        await Promise.all(promises);
        toast({ title: "Bulk Check-Out Complete", description: `${childrenToUpdate.length} children checked out.` });
    }
    
    setSelectedChildren(new Set());
  };

  const toggleSelection = (childId: string) => {
    setSelectedChildren(prev => {
        const newSet = new Set(prev);
        if (newSet.has(childId)) {
            newSet.delete(childId);
        } else {
            newSet.add(childId);
        }
        return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedChildren.size === displayChildren.length) {
        setSelectedChildren(new Set());
    } else {
        setSelectedChildren(new Set(displayChildren.map(c => c.child_id)));
    }
  };


  const handleCheckIn = async (child: RosterChild) => {
    try {
      await recordCheckIn(child.child_id, selectedEvent, undefined, user?.id);
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
        await recordCheckOut(attendanceId, verifier, user?.id);
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

  const showBulkActions = (showCheckedIn && !showCheckedOut) || (!showCheckedIn && showCheckedOut);


  const renderTable = () => (
     <Table>
        <TableHeader>
            <TableRow>
            {showBulkActions && (
                <TableHead className="w-[50px]">
                    <Checkbox 
                        onCheckedChange={toggleSelectAll}
                        checked={selectedChildren.size > 0 && selectedChildren.size === displayChildren.length}
                        aria-label="Select all"
                    />
                </TableHead>
            )}
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
            {!groupedChildren && displayChildren.map((child) => (
            <TableRow key={child.child_id} data-state={selectedChildren.has(child.child_id) && "selected"}>
                {showBulkActions && (
                    <TableCell>
                        <Checkbox 
                            checked={selectedChildren.has(child.child_id)}
                            onCheckedChange={() => toggleSelection(child.child_id)}
                            aria-label={`Select ${child.first_name}`}
                        />
                    </TableCell>
                )}
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
            {groupedChildren && Object.entries(groupedChildren)
                .sort(([gradeA], [gradeB]) => getGradeValue(gradeA) - getGradeValue(gradeB))
                .map(([grade, childrenInGrade]) => (
                <React.Fragment key={grade}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={showBulkActions ? 7 : 6} className="font-bold text-muted-foreground">
                            {grade} ({childrenInGrade.length})
                        </TableCell>
                    </TableRow>
                    {childrenInGrade.map(child => (
                        <TableRow key={child.child_id} data-state={selectedChildren.has(child.child_id) && "selected"}>
                            {showBulkActions && (
                                <TableCell>
                                    <Checkbox 
                                        checked={selectedChildren.has(child.child_id)}
                                        onCheckedChange={() => toggleSelection(child.child_id)}
                                        aria-label={`Select ${child.first_name}`}
                                    />
                                </TableCell>
                            )}
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
                </React.Fragment>
            ))}
            {displayChildren.length === 0 && (
            <TableRow>
                <TableCell colSpan={showBulkActions ? 7 : 6} className="text-center h-24 text-muted-foreground">
                    No children match the current filter.
                </TableCell>
            </TableRow>
            )}
        </TableBody>
    </Table>
  );

  const renderCards = () => (
     <div className="grid grid-cols-1 gap-4">
        {groupedChildren && Object.entries(groupedChildren)
            .sort(([gradeA], [gradeB]) => getGradeValue(gradeA) - getGradeValue(gradeB))
            .map(([grade, childrenInGrade]) => (
            <React.Fragment key={grade}>
                <div className="bg-muted/50 p-2 rounded-md">
                    <h3 className="font-bold text-muted-foreground">{grade} ({childrenInGrade.length})</h3>
                </div>
                {childrenInGrade.map(child => (
                    <RosterCard 
                        key={child.child_id}
                        child={child}
                        showBulkActions={showBulkActions}
                        isSelected={selectedChildren.has(child.child_id)}
                        onToggleSelection={toggleSelection}
                        onCheckIn={handleCheckIn}
                        onSetChildToCheckout={setChildToCheckout}
                    />
                ))}
            </React.Fragment>
        ))}
        {!groupedChildren && displayChildren.map(child => (
            <RosterCard 
                key={child.child_id}
                child={child}
                showBulkActions={showBulkActions}
                isSelected={selectedChildren.has(child.child_id)}
                onToggleSelection={toggleSelection}
                onCheckIn={handleCheckIn}
                onSetChildToCheckout={setChildToCheckout}
            />
        ))}
        {displayChildren.length === 0 && (
            <div className="text-center h-24 py-10 text-muted-foreground">
                No children match the current filter.
            </div>
        )}
     </div>
  );


  return (
    <>
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Ministry Rosters</h1>
          <p className="text-muted-foreground">
            View real-time rosters for all ministries and manage attendance.
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
                      <SelectItem value="evt_childrens_church">Children's Church</SelectItem>
                      <SelectItem value="evt_teen_church">Teen Church</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="p-0">
            <div className="p-6 bg-muted/25 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <CardTitle className="font-headline">All Children</CardTitle>
                        <CardDescription>A complete list of all children registered.</CardDescription>
                    </div>
                    <Button variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-4 gap-y-2">
                        {user?.role === 'admin' && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="group-by-grade" checked={groupByGrade} onCheckedChange={(checked) => setGroupByGrade(!!checked)} />
                                <Label htmlFor="group-by-grade">Group by Grade</Label>
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <Checkbox id="show-checked-in" checked={showCheckedIn} onCheckedChange={(checked) => setShowCheckedIn(!!checked)} />
                            <Label htmlFor="show-checked-in">Checked-In</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="show-checked-out" checked={showCheckedOut} onCheckedChange={(checked) => setShowCheckedOut(!!checked)} />
                            <Label htmlFor="show-checked-out">Checked-Out</Label>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Select value={selectedMinistryFilter} onValueChange={setSelectedMinistryFilter}>
                            <SelectTrigger className="w-full sm:w-[250px]">
                                <SelectValue placeholder="Filter by Ministry" />
                            </SelectTrigger>
                            <SelectContent>
                                    {(user?.role === 'admin' || (user?.role === 'leader' && user.assignedMinistryIds && user.assignedMinistryIds.length > 1)) && (
                                    <SelectItem value="all">All Ministries</SelectItem>
                                )}
                                {ministryFilterOptions.map(m => (
                                    <SelectItem key={m.ministry_id} value={m.ministry_id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {showBulkActions && (
                 <div className="border-b mb-4 pb-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{selectedChildren.size} children selected</p>
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={toggleSelectAll}>
                           {selectedChildren.size === displayChildren.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                    <Button onClick={handleBulkAction} disabled={selectedChildren.size === 0}>
                        {showCheckedOut ? 'Bulk Check-In' : 'Bulk Check-Out'}
                    </Button>
                </div>
            )}
          {isMobile ? renderCards() : renderTable()}
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
