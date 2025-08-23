
"use client"

import { DashboardCharts } from "@/components/ministrysync/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getTodayIsoDate } from "@/lib/dal";

export default function DashboardPage() {
    const today = getTodayIsoDate();
    
    const unacknowledgedIncidents = useLiveQuery(() => 
        db.incidents.where('admin_acknowledged_at').equals(null!).toArray()
    , []);

    const checkedInCount = useLiveQuery(() => 
        db.attendance.where({ date: today }).filter(a => !a.check_out_at).count()
    , [today]);

    const registrationCount = useLiveQuery(() =>
        db.registrations.where({cycle_id: '2025'}).count()
    , [])

    if (unacknowledgedIncidents === undefined || checkedInCount === undefined || registrationCount === undefined) {
        return <div>Loading dashboard data...</div>
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                <p className="text-muted-foreground">Overview of ministry activities and statuses.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Checked-In Children</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{checkedInCount}</div>
                        <p className="text-xs text-muted-foreground">currently on site</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{unacknowledgedIncidents.length}</div>
                        <p className="text-xs text-muted-foreground">requires acknowledgement</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{registrationCount}</div>
                        <p className="text-xs text-muted-foreground">households registered this year</p>
                    </CardContent>
                </Card>
            </div>

            <DashboardCharts />

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Recent Unacknowledged Incidents</CardTitle>
                    <CardDescription>These incidents require your immediate attention.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Child</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="w-[50%]">Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {unacknowledgedIncidents.map(incident => (
                                <TableRow key={incident.incident_id}>
                                    <TableCell className="font-medium">{incident.child_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={incident.severity === 'high' ? 'destructive' : 'secondary'} className="capitalize">
                                            {incident.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{format(new Date(incident.timestamp), "p")}</TableCell>
                                    <TableCell>{incident.description}</TableCell>
                                </TableRow>
                            ))}
                             {unacknowledgedIncidents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No unacknowledged incidents.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
