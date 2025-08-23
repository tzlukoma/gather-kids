
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { queryHouseholdList } from "@/lib/dal";
import { format } from "date-fns";
import { ChevronRight, Filter } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { db } from "@/lib/db";
import { Combobox } from "@/components/ui/combobox";

export default function RegistrationsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [ministryFilter, setMinistryFilter] = useState<string | null>(null);

    // For leaders, pass their assigned ministry IDs to the query
    const leaderMinistryIds = user?.role === 'leader' ? user.assignedMinistryIds : undefined;
    const households = useLiveQuery(() => queryHouseholdList(leaderMinistryIds, ministryFilter ?? undefined), [leaderMinistryIds, ministryFilter]);

    const allMinistries = useLiveQuery(() => db.ministries.toArray(), []);

    const handleRowClick = (householdId: string) => {
        router.push(`/dashboard/registrations/${householdId}`);
    };

    if (households === undefined) {
        return <div>Loading registrations...</div>;
    }

    const ministryOptions = allMinistries?.map(m => ({ value: m.ministry_id, label: m.name })) || [];


    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Registrations</h1>
                <p className="text-muted-foreground">
                    A list of all households that have completed the registration process.
                </p>
            </div>
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline">Registered Households</CardTitle>
                        <CardDescription>Click on a household to view their full profile.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Combobox
                            options={ministryOptions}
                            value={ministryFilter}
                            onChange={setMinistryFilter}
                            placeholder="Filter by ministry..."
                            clearable={true}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Household Name</TableHead>
                                <TableHead>Registration Date</TableHead>
                                <TableHead>Children</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {households.map((household) => (
                                <TableRow key={household.household_id} onClick={() => handleRowClick(household.household_id)} className="cursor-pointer">
                                    <TableCell className="font-medium">{household.name}</TableCell>
                                    <TableCell>{format(new Date(household.created_at), "PPP")}</TableCell>
                                    <TableCell>{household.children.map(c => `${c.first_name} (${c.age})`).join(', ')}</TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {households.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No households match the current filter.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
