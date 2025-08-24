
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
import { queryLeaders } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { User } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { useEffect, useState } from "react";

export default function LeadersPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [isAuthorized, setIsAuthorized] = useState(false);
    
    const leaders = useLiveQuery(() => queryLeaders(), []);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 'admin') {
                router.push('/dashboard'); 
            } else {
                setIsAuthorized(true);
            }
        }
    }, [user, loading, router]);

    const handleRowClick = (leaderId: string) => {
        router.push(`/dashboard/leaders/${leaderId}`);
    };

    if (loading || !isAuthorized || leaders === undefined) {
        return <div>Loading leaders...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Leaders</h1>
                <p className="text-muted-foreground">
                    Manage ministry leaders and their assignments.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">All Leaders</CardTitle>
                    <CardDescription>Click on a leader to view their profile and assign ministries.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned Ministries</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaders.map((leader) => (
                                <TableRow key={leader.user_id} onClick={() => handleRowClick(leader.user_id)} className="cursor-pointer">
                                    <TableCell className="font-medium">{leader.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={leader.is_active ? "default" : "secondary"} className={leader.is_active ? "bg-green-500" : ""}>
                                            {leader.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {leader.assignments.length > 0 ? (
                                            <span className="text-sm text-muted-foreground">
                                                {leader.assignments.map(a => a.ministryName).join(', ')}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">No assignments</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {leaders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No leaders found.
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

