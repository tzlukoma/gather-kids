import { DashboardCharts } from "@/components/ministrysync/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockIncidents } from "@/lib/mock-data";
import { AlertTriangle, Users, CheckCircle2 } from "lucide-react";

export default function DashboardPage() {
    const unacknowledgedIncidents = mockIncidents.filter(i => !i.acknowledged);

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
                        <div className="text-2xl font-bold">4</div>
                        <p className="text-xs text-muted-foreground">currently on site</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Incidents</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1</div>
                        <p className="text-xs text-muted-foreground">requires acknowledgement</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">30</div>
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
                                <TableRow key={incident.id}>
                                    <TableCell className="font-medium">{incident.childName}</TableCell>
                                    <TableCell>
                                        <Badge variant={incident.severity === 'High' ? 'destructive' : 'secondary'}>
                                            {incident.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{incident.timestamp.toLocaleTimeString()}</TableCell>
                                    <TableCell>{incident.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
