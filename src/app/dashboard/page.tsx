
"use client"

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Users, CheckCircle2, Home } from "lucide-react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getTodayIsoDate } from "@/lib/dal";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    const today = getTodayIsoDate();
    
    const unacknowledgedIncidents = useLiveQuery(() => 
        db.incidents.filter(i => i.admin_acknowledged_at === null).toArray()
    , []);

    const checkedInCount = useLiveQuery(() => 
        db.attendance.where({ date: today }).filter(a => !a.check_out_at).count()
    , [today]);

    const registrationStats = useLiveQuery(async () => {
        const registrations = await db.registrations.where({ cycle_id: '2025' }).toArray();
        if (registrations.length === 0) {
            return { householdCount: 0, childCount: 0 };
        }
        const childIds = registrations.map(r => r.child_id);
        const children = await db.children.where('child_id').anyOf(childIds).toArray();
        const householdIds = new Set(children.map(c => c.household_id));
        return {
            householdCount: householdIds.size,
            childCount: registrations.length,
        };
    }, []);
    
    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 'admin') {
                // For this prototype, non-admins are just redirected.
                // A more robust app might have a different dashboard for leaders.
                router.push('/dashboard/rosters'); 
            } else {
                setIsAuthorized(true);
            }
        }
    }, [user, loading, router]);


    if (loading || !isAuthorized || unacknowledgedIncidents === undefined || checkedInCount === undefined || registrationStats === undefined) {
        return <div>Loading dashboard data...</div>
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                <p className="text-muted-foreground">Overview of ministry activities and statuses.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href="/dashboard/rosters?status=checkedIn">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Checked-In Children</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {checkedInCount}
                                <span className="text-base font-medium text-muted-foreground"> of {registrationStats.childCount}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">registered children currently on site</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/incidents?tab=view&filter=pending">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{unacknowledgedIncidents.length}</div>
                            <p className="text-xs text-muted-foreground">requires acknowledgement</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/registrations">
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Registrations (2025)</CardTitle>
                            <Home className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{registrationStats.householdCount}</div>
                            <p className="text-xs text-muted-foreground">{registrationStats.childCount} children in {registrationStats.householdCount} households</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

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
