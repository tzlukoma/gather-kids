
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Child } from '@/lib/types';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Search, Info, Cake, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isWithinInterval, subDays, addDays, setYear, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CheckInViewProps {
  initialChildren: Child[];
  selectedEvent: string;
}

const isBirthdayThisWeek = (dob: string): boolean => {
    const today = new Date();
    const birthDate = parseISO(dob);
    
    // Get the child's birthday for the current year
    const currentYearBirthday = setYear(birthDate, today.getFullYear());

    // Check if the birthday is within 7 days (before or after) today
    const sevenDaysAgo = subDays(today, 7);
    const sevenDaysFromNow = addDays(today, 7);
    
    if (isWithinInterval(currentYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
        return true;
    }

    // Handle year-end/year-start cases (e.g., birthday is Dec 29, today is Jan 3)
    const nextYearBirthday = addYears(currentYearBirthday, 1);
    if (isWithinInterval(nextYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
        return true;
    }
    const prevYearBirthday = subYears(currentYearBirthday, 1);
     if (isWithinInterval(prevYearBirthday, { start: sevenDaysAgo, end: sevenDaysFromNow })) {
        return true;
    }

    return false;
}

// Helper to avoid issues if date-fns version doesn't have addYears/subYears
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
  'sunday-school': 'Sunday School',
  'choir-practice': "Children's Choir Practice",
  'youth-group': 'Youth Group',
};

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    return eventNames[eventId] || 'an event';
}

export function CheckInView({ initialChildren, selectedEvent }: CheckInViewProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleCheckIn = (childId: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, checkedInEvent: selectedEvent, checkInTime: new Date().toISOString() } : c))
    );
    const child = children.find(c => c.id === childId);
    toast({
      title: 'Checked In',
      description: `${child?.firstName} ${child?.lastName} has been checked in to ${getEventName(selectedEvent)}.`,
    });
  };

  const handleCheckout = (childId: string) => {
    const child = children.find(c => c.id === childId);
    const eventName = getEventName(child?.checkedInEvent);
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, checkedInEvent: null, checkInTime: undefined } : c))
    );
    toast({
        title: 'Checked Out',
        description: `${child?.firstName} ${child?.lastName} has been checked out from ${eventName}.`,
    });
  };
  
  const openCheckoutDialog = (child: Child) => {
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
        child.firstName.toLowerCase().includes(lowercasedQuery) ||
        child.lastName.toLowerCase().includes(lowercasedQuery) ||
        (child.familyName && child.familyName.toLowerCase().includes(lowercasedQuery))
    );
  }, [searchQuery, children]);

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name or family (e.g., Jackson Family)..."
          className="w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredChildren.map((child) => (
          <Card key={child.id} className="flex flex-col overflow-hidden">
            {isBirthdayThisWeek(child.dob) && (
                <div className="bg-secondary text-secondary-foreground text-center py-1 px-2 text-sm font-semibold flex items-center justify-center gap-2">
                    <Cake className="h-4 w-4" />
                    Birthday This Week!
                </div>
            )}
            <CardHeader className="flex-col items-center gap-4 space-y-0 sm:flex-row sm:items-start">
               <div className="w-[60px] h-[60px] flex-shrink-0 flex items-center justify-center rounded-full border-2 border-primary bg-secondary/50">
                    <User className="h-8 w-8 text-muted-foreground" />
               </div>
              <div className="flex-1 text-center sm:text-left">
                <CardTitle className="font-headline text-lg">{`${child.firstName} ${child.lastName}`}</CardTitle>
                <CardDescription>{child.familyName}</CardDescription>
                 <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                    {child.checkedInEvent === selectedEvent && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                    )}
                    {child.checkedInEvent && child.checkedInEvent !== selectedEvent && (
                        <Badge variant="secondary">In {getEventName(child.checkedInEvent)}</Badge>
                    )}
                    {!child.checkedInEvent && (
                        <Badge variant="secondary">Checked Out</Badge>
                    )}
                 </div>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <h4 className="font-semibold font-headline">Guardian Info</h4>
                    {child.guardians?.map(g => (
                      <div key={g.id} className="text-sm">
                        <p className="font-medium">{g.firstName} {g.lastName} ({g.relationship})</p>
                        <p className="text-muted-foreground">{g.phone}</p>
                      </div>
                    ))}
                    {!child.guardians?.length && (
                        <p className="text-sm text-muted-foreground">No guardian information available.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Grade:</strong> {child.grade}</p>
                <p><strong>Birthday:</strong> {format(parseISO(child.dob), "MMM d, yyyy")}</p>
                {child.safetyInfo && <p><strong>Notes:</strong> {child.safetyInfo}</p>}
              </div>
              {child.allergies && (
                  <Badge variant="destructive" className="w-full justify-center text-base py-1">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Allergy: {child.allergies}
                  </Badge>
              )}
            </CardContent>
            <CardFooter>
              {child.checkedInEvent === selectedEvent ? (
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
                    onClick={() => handleCheckIn(child.id)}
                    disabled={!!child.checkedInEvent}
                >
                  Check In
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
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
