
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

export default function RegistrationsPage() {
    const router = useRouter();
    const households = useLiveQuery(() => queryHouseholdList(), []);

    const handleRowClick = (householdId: string) => {
        router.push(`/dashboard/registrations/${householdId}`);
    };

    if (households === undefined) {
        return <div>Loading registrations...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Registrations</h1>
                <p className="text-muted-foreground">
                    A list of all households that have completed the registration process.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Registered Households</CardTitle>
                    <CardDescription>Click on a household to view their full profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Household Name</TableHead>
                                <TableHead>Registration Date</TableHead>
                                <TableHead>Children</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {households.map((household) => (
                                <TableRow key={household.household_id} onClick={() => handleRowClick(household.household_id)} className="cursor-pointer">
                                    <TableCell className="font-medium">{household.name}</TableCell>
                                    <TableCell>{format(new Date(household.created_at), "PPP")}</TableCell>
                                    <TableCell>{household.children.map(c => `${c.first_name} (${c.age})`).join(', ')}</TableCell>
                                </TableRow>
                            ))}
                            {households.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No households have registered yet.
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
