
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { getLeaderProfile, saveLeaderAssignments } from "@/lib/dal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, User, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { LeaderAssignment } from "@/lib/types";

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

type AssignmentState = {
    [ministryId: string]: {
        assigned: boolean;
        role: 'Primary' | 'Volunteer';
    };
};

export default function LeaderProfilePage() {
    const params = useParams();
    const leaderId = params.leaderId as string;
    const { toast } = useToast();

    const profileData = useLiveQuery(() => getLeaderProfile(leaderId, '2025'), [leaderId]);
    
    const [assignments, setAssignments] = useState<AssignmentState>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profileData) {
            const initialAssignments: AssignmentState = {};
            profileData.allMinistries.forEach(m => {
                const existingAssignment = profileData.assignments.find(a => a.ministry_id === m.ministry_id);
                initialAssignments[m.ministry_id] = {
                    assigned: !!existingAssignment,
                    role: existingAssignment?.role || 'Volunteer'
                };
            });
            setAssignments(initialAssignments);
        }
    }, [profileData]);

    const handleAssignmentChange = (ministryId: string, checked: boolean) => {
        setAssignments(prev => ({
            ...prev,
            [ministryId]: { ...prev[ministryId], assigned: checked }
        }));
    };

    const handleRoleChange = (ministryId: string, role: 'Primary' | 'Volunteer') => {
        setAssignments(prev => ({
            ...prev,
            [ministryId]: { ...prev[ministryId], role }
        }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const finalAssignments: Omit<LeaderAssignment, 'assignment_id'>[] = Object.entries(assignments)
                .filter(([, val]) => val.assigned)
                .map(([ministryId, val]) => ({
                    leader_id: leaderId,
                    ministry_id: ministryId,
                    cycle_id: '2025',
                    role: val.role
                }));
            await saveLeaderAssignments(leaderId, '2025', finalAssignments);
            toast({
                title: "Assignments Saved",
                description: "The leader's ministry assignments have been updated.",
            });
        } catch (error) {
            console.error("Failed to save assignments", error);
            toast({
                title: "Save Failed",
                description: "Could not save assignments. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!profileData) {
        return <div>Loading leader profile...</div>;
    }

    const { leader, allMinistries } = profileData;

    if (!leader) {
        return <div>Leader not found.</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">{leader.name}</h1>
                <div className="text-muted-foreground mt-1">
                    <Badge variant={leader.is_active ? "default" : "secondary"} className={leader.is_active ? "bg-green-500" : ""}>
                        {leader.is_active ? "Active" : "Inactive"}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><User /> Leader Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <InfoItem icon={<Mail size={16} />} label="Email" value={leader.email} />
                        <InfoItem icon={<Phone size={16} />} label="Phone" value={leader.mobile_phone || 'N/A'} />
                        <Separator />
                        <InfoItem icon={<CheckCircle2 size={16} />} label="Background Check" value={leader.background_check_status || 'N/A'} />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">Ministry Assignments</CardTitle>
                        <CardDescription>Select the ministries this leader is assigned to for the 2025 cycle.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {allMinistries.map(ministry => (
                            <div key={ministry.ministry_id} className="p-4 border rounded-md flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id={`min-${ministry.ministry_id}`}
                                        checked={assignments[ministry.ministry_id]?.assigned || false}
                                        onCheckedChange={(checked) => handleAssignmentChange(ministry.ministry_id, !!checked)}
                                    />
                                    <Label htmlFor={`min-${ministry.ministry_id}`} className="font-medium text-base">
                                        {ministry.name}
                                    </Label>
                                </div>
                                {assignments[ministry.ministry_id]?.assigned && (
                                    <RadioGroup
                                        value={assignments[ministry.ministry_id]?.role}
                                        onValueChange={(role: 'Primary' | 'Volunteer') => handleRoleChange(ministry.ministry_id, role)}
                                        className="flex gap-4 pl-7 md:pl-0"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Primary" id={`role-primary-${ministry.ministry_id}`} />
                                            <Label htmlFor={`role-primary-${ministry.ministry_id}`}>Primary</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="Volunteer" id={`role-volunteer-${ministry.ministry_id}`} />
                                            <Label htmlFor={`role-volunteer-${ministry.ministry_id}`}>Volunteer</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
