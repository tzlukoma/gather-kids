
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Ministry } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

function MinistryTable({ title, description, ministries }: { title: string, description: string, ministries: Ministry[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Eligibility</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ministries.map(m => (
                             <TableRow key={m.ministry_id}>
                                <TableCell className="font-medium">{m.name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{m.code}</Badge>
                                </TableCell>
                                <TableCell>
                                    {m.min_age || m.max_age ? `Ages ${m.min_age ?? '?'} - ${m.max_age ?? '?'}` : 'All ages'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {ministries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    No ministries of this type found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export default function ConfigurationPage() {
    const allMinistries = useLiveQuery(() => db.ministries.toArray(), []);

    const { enrolledPrograms, interestPrograms } = useMemo(() => {
        if (!allMinistries) return { enrolledPrograms: [], interestPrograms: [] };
        const enrolled = allMinistries.filter(m => m.enrollment_type === 'enrolled' && !m.code.startsWith('min_sunday'));
        const interest = allMinistries.filter(m => m.enrollment_type === 'interest_only');
        return { enrolledPrograms: enrolled, interestPrograms: interest };
    }, [allMinistries]);

    if (!allMinistries) {
        return <div>Loading configuration...</div>
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Configuration</h1>
                <p className="text-muted-foreground">
                    Manage the ministries and activities available for registration.
                </p>
            </div>
            
            <MinistryTable 
                title="Ministry Programs"
                description="These are programs children can be officially enrolled in."
                ministries={enrolledPrograms}
            />

            <MinistryTable 
                title="Interest-Only Activities"
                description="These are activities to gauge interest, but do not create an official enrollment."
                ministries={interestPrograms}
            />
        </div>
    );
}
