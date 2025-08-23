
"use client"

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { IncidentForm } from "@/components/ministrysync/incident-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Incident } from "@/lib/types";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { acknowledgeIncident } from "@/lib/dal";

export default function IncidentsPage() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("log");
    const [showPendingOnly, setShowPendingOnly] = useState(false);

    const incidents = useLiveQuery(() => db.incidents.orderBy('timestamp').reverse().toArray(), []);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'view') {
            setActiveTab('view');
        }
        const filterParam = searchParams.get('filter');
        if (filterParam === 'pending') {
            setShowPendingOnly(true);
        }
    }, [searchParams]);

    const displayedIncidents = useMemo(() => {
        if (!incidents) return [];
        if (showPendingOnly) {
            return incidents.filter(incident => !incident.admin_acknowledged_at);
        }
        return incidents;
    }, [incidents, showPendingOnly]);

    const handleAcknowledge = async (incidentId: string) => {
        try {
            await acknowledgeIncident(incidentId);
            toast({
                title: "Incident Acknowledged",
                description: "The incident has been marked as acknowledged.",
            });
        } catch (error) {
            console.error("Failed to acknowledge incident", error);
            toast({
                title: "Error",
                description: "Failed to acknowledge the incident.",
                variant: "destructive"
            });
        }
    }

  if (!incidents) return <div>Loading incidents...</div>

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Incident Management</h1>
        <p className="text-muted-foreground">
          Log new incidents and review past occurrences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="log">Log New Incident</TabsTrigger>
          <TabsTrigger value="view">View Incidents</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Log an Incident</CardTitle>
                    <CardDescription>
                        Complete this form to document an incident that occurred during a session.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <IncidentForm />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="view">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Incident History</CardTitle>
                            <CardDescription>A log of all past incidents.</CardDescription>
                        </div>
                         <div className="flex items-center space-x-2">
                            <Checkbox id="show-pending" checked={showPendingOnly} onCheckedChange={(checked) => setShowPendingOnly(!!checked)} />
                            <Label htmlFor="show-pending">Show pending only</Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Child</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead className="w-[40%]">Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {displayedIncidents.map((incident) => (
                            <TableRow key={incident.incident_id}>
                                <TableCell className="font-medium">{incident.child_name}</TableCell>
                                <TableCell>
                                    <Badge variant={incident.severity === "high" ? "destructive" : incident.severity === "medium" ? "secondary" : "outline"} className="capitalize">
                                        {incident.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(incident.timestamp), "PPpp")}</TableCell>
                                <TableCell>{incident.description}</TableCell>
                                <TableCell>
                                    <Badge variant={incident.admin_acknowledged_at ? "default" : "destructive"} className={incident.admin_acknowledged_at ? 'bg-green-500 hover:bg-green-600' : ''}>
                                        {incident.admin_acknowledged_at ? "Acknowledged" : "Pending"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {!incident.admin_acknowledged_at && (
                                        <Button size="sm" onClick={() => handleAcknowledge(incident.incident_id)}>Acknowledge</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {displayedIncidents.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No incidents match the current filter.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
