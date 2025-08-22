
'use client';

import { useState } from 'react';
import { mockChildren } from '@/lib/mock-data';
import { CheckInView } from '@/components/ministrysync/check-in-view';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CheckInPage() {
  const [selectedEvent, setSelectedEvent] = useState('sunday-school');
  // In a real application, you would fetch this data from your database.
  const children = mockChildren;

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
                    <SelectItem value="sunday-school">Sunday School</SelectItem>
                    <SelectItem value="choir-practice">Children's Choir Practice</SelectItem>
                    <SelectItem value="youth-group">Youth Group</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <CheckInView initialChildren={children} selectedEvent={selectedEvent} />
    </div>
  );
}
