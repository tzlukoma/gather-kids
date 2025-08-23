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
import { FileDown } from "lucide-react";
import { format } from "date-fns";
import { getTodayIsoDate } from "@/lib/dal";
import { useMemo } from "react";
import type { Child, Attendance } from "@/lib/types";

interface ChildWithAttendance extends Child {
  attendance?: Attendance;
}

export default function RostersPage() {
  const today = getTodayIsoDate();
  const allChildren = useLiveQuery(() => db.children.toArray(), []);
  const todaysAttendance = useLiveQuery(() => db.attendance.where({ date: today }).toArray(), [today]);

  const childrenWithAttendance: ChildWithAttendance[] = useMemo(() => {
    if (!allChildren || !todaysAttendance) return [];
    
    const attendanceMap = new Map(todaysAttendance.map(a => [a.child_id, a]));

    return allChildren.map(child => ({
      ...child,
      attendance: attendanceMap.get(child.child_id),
    }));
  }, [allChildren, todaysAttendance]);


  if (!allChildren || !todaysAttendance) {
    return <div>Loading rosters...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Class Rosters</h1>
        <p className="text-muted-foreground">
          View real-time rosters for all classes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">All Children</CardTitle>
                <CardDescription>A complete list of all children registered.</CardDescription>
            </div>
            <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-In Time</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childrenWithAttendance.map((child) => (
                <TableRow key={child.child_id}>
                  <TableCell className="font-medium">{`${child.first_name} ${child.last_name}`}</TableCell>
                  <TableCell>{child.grade}</TableCell>
                  <TableCell>
                    {child.attendance ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                    ) : (
                      <Badge variant="secondary">Checked Out</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {child.attendance?.check_in_at ? format(new Date(child.attendance.check_in_at), "p") : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {child.allergies && (
                      <Badge variant="destructive">Allergy</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
