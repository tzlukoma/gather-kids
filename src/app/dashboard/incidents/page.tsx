"use client"

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import type { Incident } from "@/lib/types";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { acknowledgeIncident } from "@/lib/dal";

export default function IncidentsPage() {
    const { toast } = useToast();

    const incidents = useLiveQuery(() => db.incidents.orderBy('timestamp').reverse().toArray(), []);

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

      <Tabs defaultValue="log">
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
                    <CardTitle className="font-headline">Incident History</CardTitle>
                    <CardDescription>A log of all past incidents.</CardDescription>
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
                        {incidents.map((incident) => (
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
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
