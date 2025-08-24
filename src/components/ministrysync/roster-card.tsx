
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { RosterChild } from "@/app/dashboard/rosters/page";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Info, CheckCircle, Smartphone } from "lucide-react";
import { Separator } from "../ui/separator";

interface RosterCardProps {
    child: RosterChild;
    showBulkActions: boolean;
    isSelected: boolean;
    onToggleSelection: (childId: string) => void;
    onCheckIn: (child: RosterChild) => void;
    onSetChildToCheckout: (child: RosterChild) => void;
}

export function RosterCard({ child, showBulkActions, isSelected, onToggleSelection, onCheckIn, onSetChildToCheckout }: RosterCardProps) {
    const canSelfCheckout = child.age !== null && child.age >= 13;
    
    return (
        <Card key={child.child_id} className={isSelected ? 'border-primary' : ''}>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="font-headline text-lg">{`${child.first_name} ${child.last_name}`}</CardTitle>
                    <CardDescription>{child.grade}</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <Info className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                             <div className="space-y-4">
                                {canSelfCheckout && child.child_mobile && (
                                    <div>
                                        <h4 className="font-semibold font-headline mb-2 flex items-center gap-2"><CheckCircle className="text-green-500" /> Self-Checkout Allowed</h4>
                                        <div className="text-sm">
                                            <p className="font-medium">{child.first_name} {child.last_name}</p>
                                            <p className="text-muted-foreground flex items-center gap-2"><Smartphone size={14} />{child.child_mobile}</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold font-headline mb-2">Guardians</h4>
                                    <div className="space-y-3">
                                        {child.guardians?.map(g => (
                                            <div key={g.guardian_id} className="text-sm">
                                            <p className="font-medium">{g.first_name} {g.last_name} ({g.relationship})</p>
                                            <p className="text-muted-foreground">{g.mobile_phone}</p>
                                            </div>
                                        ))}
                                        {!child.guardians?.length && (
                                            <p className="text-sm text-muted-foreground">No guardian information available.</p>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold font-headline mb-2">Emergency Contact</h4>
                                    {child.emergencyContact ? (
                                        <div className="text-sm">
                                            <p className="font-medium">{child.emergencyContact.first_name} {child.emergencyContact.last_name} ({child.emergencyContact.relationship})</p>
                                            <p className="text-muted-foreground">{child.emergencyContact.mobile_phone}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No emergency contact available.</p>
                                    )}
                                </div>
                                </div>
                        </PopoverContent>
                    </Popover>
                    {showBulkActions && (
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelection(child.child_id)}
                            aria-label={`Select ${child.first_name}`}
                        />
                    )}
                 </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    {child.activeAttendance ? (
                        <Badge className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                    ) : (
                        <Badge variant="secondary">Checked Out</Badge>
                    )}
                </div>
                {child.allergies && (
                    <Badge variant="destructive">Allergy: {child.allergies}</Badge>
                )}
            </CardContent>
            <CardFooter>
                 {child.activeAttendance ? (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => onSetChildToCheckout(child)}>Check Out</Button>
                ) : (
                    <Button size="sm" className="w-full" onClick={() => onCheckIn(child)}>Check In</Button>
                )}
            </CardFooter>
        </Card>
    )
}
