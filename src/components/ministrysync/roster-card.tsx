
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { RosterChild } from "@/app/dashboard/rosters/page";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";

interface RosterCardProps {
    child: RosterChild;
    showBulkActions: boolean;
    isSelected: boolean;
    onToggleSelection: (childId: string) => void;
    onCheckIn: (child: RosterChild) => void;
    onSetChildToCheckout: (child: RosterChild) => void;
}

export function RosterCard({ child, showBulkActions, isSelected, onToggleSelection, onCheckIn, onSetChildToCheckout }: RosterCardProps) {
    return (
        <Card key={child.child_id} className={isSelected ? 'border-primary' : ''}>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="font-headline text-lg">{`${child.first_name} ${child.last_name}`}</CardTitle>
                    <CardDescription>{child.grade}</CardDescription>
                </div>
                {showBulkActions && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelection(child.child_id)}
                        aria-label={`Select ${child.first_name}`}
                    />
                )}
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
