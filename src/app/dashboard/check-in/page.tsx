
'use client';

import { useState } from 'react';
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

export default function CheckInPage() {
  const [selectedEvent, setSelectedEvent] = useState('evt_sunday_school');
  
  const children = useLiveQuery(() => db.children.toArray(), []);

  if (!children) {
    return (
        <div className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Loading children's data...</p>
        </div>
    )
  }

  if(children.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-64 p-8 text-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">The database is currently empty.</p>
            <p className="text-sm text-muted-foreground">You can populate it with sample data to get started.</p>
            <Button onClick={seedDB} className="mt-4">Seed Database</Button>
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
      <CheckInView initialChildren={children} selectedEvent={selectedEvent} />
    </div>
  );
}
