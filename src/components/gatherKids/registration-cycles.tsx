'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RegistrationCycle } from '@/lib/types';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Alert,
    AlertTitle,
    AlertDescription,
} from '@/components/ui/alert';
import { CalendarIcon } from 'lucide-react';

export default function RegistrationCycles() {
    const [newCycle, setNewCycle] = useState<Partial<RegistrationCycle>>({
        cycle_id: '',
        start_date: '',
        end_date: '',
        is_active: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Use Dexie Live Query to automatically update when data changes
    const cycles = useLiveQuery(
        () => db.registration_cycles
            .toArray()
            .then(data => data.sort((a, b) => a.start_date.localeCompare(b.start_date))),
        []
    ) || [];

    const handleCreateCycle = async () => {
        if (!newCycle.cycle_id || !newCycle.start_date || !newCycle.end_date) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setIsLoading(true);

            // If this cycle is active, deactivate all others
            if (newCycle.is_active) {
                await Promise.all(
                    cycles.map(async (cycle) => {
                        if (cycle.is_active) {
                            await db.registration_cycles.update(cycle.cycle_id, {
                                is_active: false,
                            });
                        }
                    })
                );
            }

            await db.registration_cycles.put({
                cycle_id: newCycle.cycle_id,
                start_date: newCycle.start_date,
                end_date: newCycle.end_date,
                is_active: newCycle.is_active || false,
            });

            toast({
                title: 'Success',
                description: 'Registration cycle created successfully',
            });

            setNewCycle({
                cycle_id: '',
                start_date: '',
                end_date: '',
                is_active: false,
            });
            
            // No need to fetch cycles - useLiveQuery will automatically update
        } catch (err: any) {
            setError(`Failed to create registration cycle: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleActive = async (cycleId: string, isActive: boolean) => {
        try {
            setIsLoading(true);

            // Deactivate all other cycles first
            if (isActive) {
                await Promise.all(
                    cycles.map(async (cycle) => {
                        if (cycle.cycle_id !== cycleId && cycle.is_active) {
                            await db.registration_cycles.update(cycle.cycle_id, {
                                is_active: false,
                            });
                        }
                    })
                );
            }

            // Set the selected cycle's active status
            await db.registration_cycles.update(cycleId, { is_active });

            toast({
                title: 'Success',
                description: isActive
                    ? `Registration cycle ${cycleId} is now active`
                    : `Registration cycle ${cycleId} is now inactive`,
            });
            
            // No need to fetch cycles - useLiveQuery will automatically update
        } catch (err: any) {
            setError(`Failed to update cycle status: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-8">
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Create New Registration Cycle</CardTitle>
                    <CardDescription>
                        Add a new registration cycle to the system
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="cycle_id">Cycle ID/Year</Label>
                            <Input
                                id="cycle_id"
                                value={newCycle.cycle_id}
                                onChange={(e) =>
                                    setNewCycle({ ...newCycle, cycle_id: e.target.value })
                                }
                                placeholder="e.g., 2026"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={newCycle.is_active}
                                    onCheckedChange={(checked) =>
                                        setNewCycle({ ...newCycle, is_active: checked })
                                    }
                                />
                                <Label htmlFor="is_active">Active Registration Cycle</Label>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !newCycle.start_date && 'text-muted-foreground'
                                        )}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newCycle.start_date ? (
                                            format(new Date(newCycle.start_date), 'PPP')
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={
                                            newCycle.start_date
                                                ? new Date(newCycle.start_date)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setNewCycle({
                                                ...newCycle,
                                                start_date: date ? date.toISOString() : '',
                                            })
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={'outline'}
                                        className={cn(
                                            'w-full justify-start text-left font-normal',
                                            !newCycle.end_date && 'text-muted-foreground'
                                        )}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {newCycle.end_date ? (
                                            format(new Date(newCycle.end_date), 'PPP')
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={
                                            newCycle.end_date
                                                ? new Date(newCycle.end_date)
                                                : undefined
                                        }
                                        onSelect={(date) =>
                                            setNewCycle({
                                                ...newCycle,
                                                end_date: date ? date.toISOString() : '',
                                            })
                                        }
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleCreateCycle}
                        disabled={
                            isLoading ||
                            !newCycle.cycle_id ||
                            !newCycle.start_date ||
                            !newCycle.end_date
                        }>
                        {isLoading ? 'Creating...' : 'Create Registration Cycle'}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Registration Cycles</CardTitle>
                    <CardDescription>
                        Manage existing registration cycles
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {cycles.length === 0 ? (
                        <p className="text-muted-foreground">
                            No registration cycles found.
                        </p>
                    ) : (
                        <div className="space-y-6">
                            {cycles.map((cycle) => (
                                <div
                                    key={cycle.cycle_id}
                                    className="flex items-center justify-between border-b pb-4">
                                    <div>
                                        <h3 className="text-lg font-medium">{cycle.cycle_id}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(cycle.start_date), 'PPP')} to{' '}
                                            {format(new Date(cycle.end_date), 'PPP')}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={cycle.is_active}
                                            onCheckedChange={(checked) =>
                                                handleToggleActive(cycle.cycle_id, checked)
                                            }
                                            disabled={isLoading}
                                        />
                                        <Label>Active</Label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
