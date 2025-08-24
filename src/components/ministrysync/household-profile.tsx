

"use client";

import type { HouseholdProfileData } from "@/lib/dal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { Mail, Phone, User, Home, CheckCircle2, HeartPulse } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);

const ProgramEnrollmentCard = ({ enrollment }: { enrollment: HouseholdProfileData['children'][0]['enrollmentsByCycle'][string][0] }) => {
    const customFields = enrollment.custom_fields || {};
    const customQuestions = enrollment.customQuestions || [];
    
    return (
        <div className="p-3 rounded-md border bg-muted/25">
            <div className="flex justify-between items-center">
                <p className="font-medium">{enrollment.ministryName}</p>
                <Badge variant={enrollment.status === 'enrolled' ? 'default' : 'secondary'}>{enrollment.status.replace('_', ' ')}</Badge>
            </div>
            {Object.keys(customFields).length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground pl-4 border-l-2 ml-2 space-y-1">
                    {Object.entries(customFields).map(([key, value]) => {
                        const question = customQuestions.find(q => q.id === key);
                        if (!question) return null;

                        const displayValue = typeof value === 'boolean' ? (value ? "Yes" : "No") : String(value);

                        return (
                            <p key={key}>
                                <strong>{question?.text}:</strong> {displayValue}
                            </p>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export function HouseholdProfile({ profileData }: { profileData: HouseholdProfileData }) {
    const { household, guardians, emergencyContact, children } = profileData;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">{household?.name}</h1>
                <p className="text-muted-foreground">
                    Registered on {household && format(parseISO(household.created_at), "PPpp")}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><User /> Guardians & Contacts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {guardians.map(g => (
                            <div key={g.guardian_id} className="space-y-2">
                                <h4 className="font-semibold">{g.first_name} {g.last_name} ({g.relationship}) {g.is_primary && <Badge>Primary</Badge>}</h4>
                                <InfoItem icon={<Mail size={16} />} label="Email" value={g.email || 'N/A'} />
                                <InfoItem icon={<Phone size={16} />} label="Phone" value={g.mobile_phone} />
                            </div>
                        ))}
                        <Separator />
                        {emergencyContact && (
                            <div className="space-y-2">
                                <h4 className="font-semibold">{emergencyContact.first_name} {emergencyContact.last_name} (Emergency)</h4>
                                <InfoItem icon={<Phone size={16} />} label="Phone" value={emergencyContact.mobile_phone} />
                                <InfoItem icon={<User size={16} />} label="Relationship" value={emergencyContact.relationship} />
                            </div>
                        )}
                        <Separator />
                         <div className="space-y-2">
                            <h4 className="font-semibold">Address</h4>
                            <InfoItem icon={<Home size={16} />} label="Address" value={household?.address_line1 || 'N/A'} />
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    {children.map(child => {
                        const sortedCycleIds = Object.keys(child.enrollmentsByCycle).sort((a, b) => b.localeCompare(a));
                        const currentCycleId = sortedCycleIds.length > 0 ? sortedCycleIds[0] : undefined;

                        return (
                            <Card key={child.child_id}>
                                <CardHeader>
                                    <CardTitle className="font-headline flex items-center gap-2">
                                        {child.first_name} {child.last_name}
                                        {!child.is_active && <Badge variant="outline">Inactive</Badge>}
                                    </CardTitle>
                                    <CardDescription>{child.grade} (Age {child.age})</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoItem icon={<HeartPulse size={16} />} label="Allergies / Medical" value={child.allergies || "None"} />
                                        <InfoItem icon={<HeartPulse size={16} />} label="Special Needs" value={child.special_needs ? (child.special_needs_notes || 'Yes') : 'No'} />
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle2 /> Program Enrollments & Interests</h4>
                                        <Accordion type="multiple" defaultValue={currentCycleId ? [currentCycleId] : []} className="w-full">
                                            {sortedCycleIds.map((cycleId) => {
                                                const enrollments = child.enrollmentsByCycle[cycleId];
                                                return (
                                                    <AccordionItem key={cycleId} value={cycleId}>
                                                        <AccordionTrigger>
                                                            {cycleId} Registration Year
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="space-y-3">
                                                                {enrollments.map(e => <ProgramEnrollmentCard key={e.enrollment_id} enrollment={e} />)}
                                                                {enrollments.length === 0 && <p className="text-sm text-muted-foreground">No program enrollments or interests listed for this year.</p>}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            })}
                                        </Accordion>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
