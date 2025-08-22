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
import { mockIncidents } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import type { Incident } from "@/lib/types";

export default function IncidentsPage() {
    const [incidents, setIncidents] = useState<Incident[]>(mockIncidents);
    const { toast } = useToast();

    const handleAcknowledge = (incidentId: string) => {
        setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, acknowledged: true } : i));
        toast({
            title: "Incident Acknowledged",
            description: "The incident has been marked as acknowledged.",
        });
    }

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
                        {incidents.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).map((incident) => (
                            <TableRow key={incident.id}>
                                <TableCell className="font-medium">{incident.childName}</TableCell>
                                <TableCell>
                                    <Badge variant={incident.severity === "High" ? "destructive" : incident.severity === "Medium" ? "secondary" : "outline"}>
                                        {incident.severity}
                                    </Badge>
                                </TableCell>
                                <TableCell>{incident.timestamp.toLocaleString()}</TableCell>
                                <TableCell>{incident.description}</TableCell>
                                <TableCell>
                                    <Badge variant={incident.acknowledged ? "default" : "destructive"} className={incident.acknowledged ? 'bg-green-500 hover:bg-green-600' : ''}>
                                        {incident.acknowledged ? "Acknowledged" : "Pending"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {!incident.acknowledged && (
                                        <Button size="sm" onClick={() => handleAcknowledge(incident.id)}>Acknowledge</Button>
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
