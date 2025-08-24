
'use client';

import { useState, useMemo, useEffect } from 'react';
import { CheckInView } from '@/components/ministrysync/check-in-view';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { seedDB } from '@/lib/seed';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Users, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTodayIsoDate } from '@/lib/dal';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const gradeSortOrder: { [key: string]: number } = {
    "Pre-K": 0, "Kindergarten": 1, "1st Grade": 2, "2nd Grade": 3, "3rd Grade": 4, "4th Grade": 5,
    "5th Grade": 6, "6th Grade": 7, "7th Grade": 8, "9th Grade": 9, "10th Grade": 10,
    "11th Grade": 11, "12th Grade": 12, "13th Grade": 13,
};

const getGradeValue = (grade?: string): number => {
    if (!grade) return 99;
    const value = gradeSortOrder[grade];
    return value !== undefined ? value : 99;
};

export type StatusFilter = 'all' | 'checkedIn' | 'checkedOut';

export default function CheckInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const isMobile = useIsMobile();

  const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
  const children = useLiveQuery(() => db.children.toArray(), []);
  const today = getTodayIsoDate();
  const todaysAttendance = useLiveQuery(() => db.attendance.where({date: today}).toArray(), [today]);
  
  const checkedInCount = useMemo(() => {
    if (!todaysAttendance) return 0;
    return todaysAttendance.filter(a => !a.check_out_at).length;
  }, [todaysAttendance]);

  useEffect(() => {
    if (!loading && user) {
        const authorized = user.role === 'admin' || (user.role === 'leader' && user.assignedMinistryIds?.includes('min_sunday_school'));
        if (!authorized) {
            router.push('/dashboard');
        } else {
            setIsAuthorized(true);
        }
    }
  }, [user, loading, router]);


  const availableGrades = useMemo(() => {
    if (!children) return [];
    const grades = new Set(children.map(c => c.grade).filter(Boolean) as string[]);
    return Array.from(grades).sort((a, b) => getGradeValue(a) - getGradeValue(b));
  }, [children]);

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => {
        const newSet = new Set(prev);
        if (newSet.has(grade)) {
            newSet.delete(grade);
        } else {
            newSet.add(grade);
        }
        return newSet;
    })
  }

  const FilterControls = () => (
    <div className="space-y-4">
        <div className='space-y-2'>
            <Label className="font-semibold shrink-0">Filter by Status:</Label>
            <div className="flex flex-wrap gap-2 items-center">
                <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')}>All</Button>
                <Button variant={statusFilter === 'checkedIn' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('checkedIn')}>Checked In</Button>
                <Button variant={statusFilter === 'checkedOut' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('checkedOut')}>Checked Out</Button>
            </div>
       </div>
       <div className='space-y-2'>
            <Label className="font-semibold shrink-0">Filter by Grade:</Label>
            <div className="flex flex-wrap gap-2 items-center">
                {availableGrades.map(grade => (
                    <Button 
                        key={grade}
                        variant={selectedGrades.has(grade) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleGrade(grade)}
                        className="rounded-full"
                    >
                        {grade}
                    </Button>
                ))}
                {selectedGrades.size > 0 && (
                    <Button variant="link" size="sm" onClick={() => setSelectedGrades(new Set())}>Clear</Button>
                )}
            </div>
        </div>
    </div>
  );
  
  if (loading || !isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Verifying access...</p>
        </div>
    )
  }

  if (!children || !todaysAttendance) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Loading children's data...</p>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline">Child Check-In & Out</h1>
            <p className="text-muted-foreground">
            Manage child check-ins and check-outs for today's services.
            </p>
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="event-select">Select Event</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger id="event-select">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently Checked In</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {checkedInCount}
                    <span className="text-base font-medium text-muted-foreground"> of {children.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">children currently on site</p>
            </CardContent>
        </Card>
      
        {isMobile ? (
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                    Refine the list of children below.
                </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                <FilterControls />
                </div>
                <SheetFooter>
                <Button onClick={() => setIsFilterSheetOpen(false)} className="w-full">
                    View Results
                </Button>
                </SheetFooter>
            </SheetContent>
            </Sheet>
        ) : (
            <Card className="md:col-span-2">
                <CardContent className="pt-6">
                    <FilterControls />
                </CardContent>
            </Card>
        )}
      </div>

      <CheckInView initialChildren={children} selectedEvent={selectedEvent} selectedGrades={Array.from(selectedGrades)} statusFilter={statusFilter} />
    </div>
  );
}
