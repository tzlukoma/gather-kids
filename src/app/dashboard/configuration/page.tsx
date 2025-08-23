

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Ministry } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { MinistryFormDialog } from "@/components/ministrysync/ministry-form-dialog";
import { deleteMinistry } from "@/lib/dal";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function MinistryTable({ 
    title, 
    description, 
    ministries, 
    onEdit,
    onDelete
}: { 
    title: string, 
    description: string, 
    ministries: Ministry[],
    onEdit: (ministry: Ministry) => void,
    onDelete: (ministryId: string) => void
}) {
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
                            <TableHead className="text-right">Actions</TableHead>
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
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(m)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the ministry.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(m.ministry_id)} className="bg-destructive hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {ministries.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
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
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);

    const { enrolledPrograms, interestPrograms } = useMemo(() => {
        if (!allMinistries) return { enrolledPrograms: [], interestPrograms: [] };
        const enrolled = allMinistries
            .filter(m => m.enrollment_type === 'enrolled' && !m.code.startsWith('min_sunday'))
            .sort((a, b) => a.name.localeCompare(b.name));
        const interest = allMinistries
            .filter(m => m.enrollment_type === 'interest_only')
            .sort((a, b) => a.name.localeCompare(b.name));
        return { enrolledPrograms: enrolled, interestPrograms: interest };
    }, [allMinistries]);

    const handleAddNew = () => {
        setEditingMinistry(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (ministry: Ministry) => {
        setEditingMinistry(ministry);
        setIsDialogOpen(true);
    };

    const handleDelete = async (ministryId: string) => {
        try {
            await deleteMinistry(ministryId);
            toast({
                title: 'Ministry Deleted',
                description: 'The ministry has been successfully deleted.',
            });
        } catch (error) {
            console.error('Failed to delete ministry', error);
            toast({
                title: 'Error Deleting Ministry',
                description: 'Could not delete the ministry. Please try again.',
                variant: 'destructive',
            });
        }
    };


    if (!allMinistries) {
        return <div>Loading configuration...</div>
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Configuration</h1>
                    <p className="text-muted-foreground">
                        Manage the ministries and activities available for registration.
                    </p>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2" />
                    Add New Program
                </Button>
            </div>
            
            <MinistryTable 
                title="Ministry Programs"
                description="These are programs children can be officially enrolled in."
                ministries={enrolledPrograms}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <MinistryTable 
                title="Interest-Only Activities"
                description="These are activities to gauge interest, but do not create an official enrollment."
                ministries={interestPrograms}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <MinistryFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                ministry={editingMinistry}
            />
        </div>
    );
}
