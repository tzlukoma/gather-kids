'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { 
    createBibleBeeYear, 
    updateBibleBeeYear, 
    deleteBibleBeeYear,
    createDivision,
    updateDivision,
    deleteDivision,
    createEssayPrompt,
    updateEssayPrompt,
    deleteEssayPrompt,
    previewAutoEnrollment,
    commitAutoEnrollment,
    createEnrollmentOverride,
    deleteEnrollmentOverrideByChild,
    recalculateMinimumBoundaries
} from '@/lib/bibleBee';
import { gradeCodeToLabel } from '@/lib/gradeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    Users, 
    FileText, 
    Upload,
    Calculator,
    AlertTriangle,
    CheckCircle 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface BibleBeeManageProps {
    className?: string;
}

export default function BibleBeeManage({ className }: BibleBeeManageProps) {
    const [activeTab, setActiveTab] = useState('years');
    const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

    // Load data
    const bibleBeeYears = useLiveQuery(() => 
        db.bible_bee_years.orderBy('label').toArray(), []
    );
    
    const divisions = useLiveQuery(async () => 
        selectedYearId 
            ? await db.divisions.where('year_id').equals(selectedYearId).toArray()
            : [], 
        [selectedYearId]
    );

    const essayPrompts = useLiveQuery(async () => 
        selectedYearId 
            ? await db.essay_prompts.where('year_id').equals(selectedYearId).toArray()
            : [], 
        [selectedYearId]
    );

    // Get the active year for default selection
    React.useEffect(() => {
        if (bibleBeeYears && bibleBeeYears.length > 0 && !selectedYearId) {
            const activeYear = bibleBeeYears.find(y => y.is_active) || bibleBeeYears[0];
            setSelectedYearId(activeYear.id);
        }
    }, [bibleBeeYears, selectedYearId]);

    const selectedYear = bibleBeeYears?.find(y => y.id === selectedYearId);

    return (
        <div className={className}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Bible Bee Management</h1>
                    <p className="text-muted-foreground">
                        Configure competition years, divisions, and enrollment
                    </p>
                </div>
                
                {/* Year Selector */}
                <div className="flex items-center gap-4">
                    <Label htmlFor="year-select">Active Year:</Label>
                    <Select value={selectedYearId || ''} onValueChange={setSelectedYearId}>
                        <SelectTrigger className="w-48" id="year-select">
                            <SelectValue placeholder="Select year..." />
                        </SelectTrigger>
                        <SelectContent>
                            {bibleBeeYears?.map(year => (
                                <SelectItem key={year.id} value={year.id}>
                                    {year.label} {year.is_active && '(Active)'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="years">Years</TabsTrigger>
                    <TabsTrigger value="divisions">Divisions</TabsTrigger>
                    <TabsTrigger value="scriptures">Scriptures</TabsTrigger>
                    <TabsTrigger value="essays">Essays</TabsTrigger>
                    <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
                    <TabsTrigger value="overrides">Overrides</TabsTrigger>
                </TabsList>

                <TabsContent value="years">
                    <YearManagement />
                </TabsContent>

                <TabsContent value="divisions">
                    {selectedYear ? (
                        <DivisionManagement 
                            yearId={selectedYear.id} 
                            yearLabel={selectedYear.label}
                            divisions={divisions || []}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Please select a year to manage divisions
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="scriptures">
                    {selectedYear ? (
                        <ScriptureManagement 
                            yearId={selectedYear.id} 
                            yearLabel={selectedYear.label}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Please select a year to manage scriptures
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="essays">
                    {selectedYear ? (
                        <EssayManagement 
                            yearId={selectedYear.id} 
                            yearLabel={selectedYear.label}
                            essayPrompts={essayPrompts || []}
                            divisions={divisions || []}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Please select a year to manage essays
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="enrollment">
                    {selectedYear ? (
                        <EnrollmentManagement 
                            yearId={selectedYear.id} 
                            yearLabel={selectedYear.label}
                            divisions={divisions || []}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Please select a year to manage enrollment
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="overrides">
                    {selectedYear ? (
                        <OverrideManagement 
                            yearId={selectedYear.id} 
                            yearLabel={selectedYear.label}
                            divisions={divisions || []}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Please select a year to manage overrides
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Year Management Component
function YearManagement() {
    const [isCreating, setIsCreating] = useState(false);
    const [editingYear, setEditingYear] = useState<any>(null);
    const [formData, setFormData] = useState({
        label: '',
        is_active: false
    });

    const bibleBeeYears = useLiveQuery(() => 
        db.bible_bee_years.orderBy('label').toArray(), []
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingYear) {
                await updateBibleBeeYear(editingYear.id, formData);
                setEditingYear(null);
            } else {
                await createBibleBeeYear(formData);
                setIsCreating(false);
            }
            setFormData({ label: '', is_active: false });
        } catch (error) {
            console.error('Error saving year:', error);
            alert('Error saving year: ' + error);
        }
    };

    const handleDelete = async (year: any) => {
        if (confirm(`Delete year "${year.label}"? This will also delete all divisions, enrollments, and overrides.`)) {
            try {
                await deleteBibleBeeYear(year.id);
            } catch (error) {
                console.error('Error deleting year:', error);
                alert('Error deleting year: ' + error);
            }
        }
    };

    const startEdit = (year: any) => {
        setEditingYear(year);
        setFormData({
            label: year.label,
            is_active: year.is_active
        });
        setIsCreating(true);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Bible Bee Years</CardTitle>
                        <CardDescription>Manage competition years</CardDescription>
                    </div>
                    <Button 
                        onClick={() => setIsCreating(true)}
                        disabled={isCreating}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Year
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isCreating && (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
                        <div>
                            <Label htmlFor="year-label">Year Label</Label>
                            <Input
                                id="year-label"
                                placeholder="e.g., 2025–2026"
                                value={formData.label}
                                onChange={(e) => setFormData({...formData, label: e.target.value})}
                                required
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is-active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                className="rounded"
                            />
                            <Label htmlFor="is-active">Active Year</Label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">
                                {editingYear ? 'Update' : 'Create'}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    setIsCreating(false);
                                    setEditingYear(null);
                                    setFormData({ label: '', is_active: false });
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}

                {bibleBeeYears && bibleBeeYears.length > 0 ? (
                    <div className="space-y-2">
                        {bibleBeeYears.map(year => (
                            <div key={year.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <h3 className="font-medium">{year.label}</h3>
                                    {year.is_active && (
                                        <Badge variant="default" className="mt-1">Active</Badge>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEdit(year)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(year)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No Bible Bee years created yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Division Management Component  
function DivisionManagement({ yearId, yearLabel, divisions }: {
    yearId: string;
    yearLabel: string;
    divisions: any[];
}) {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [editingDivision, setEditingDivision] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        minimum_required: 0,
        min_grade: 0,
        max_grade: 12
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (editingDivision) {
                await updateDivision(editingDivision.id, formData);
                toast({
                    title: `${formData.name} Division Updated`,
                    description: 'Division information has been successfully updated.',
                });
                setEditingDivision(null);
                setIsCreating(false);
            } else {
                await createDivision({ ...formData, year_id: yearId });
                setIsCreating(false);
            }
            setFormData({ name: '', minimum_required: 0, min_grade: 0, max_grade: 12 });
        } catch (error: any) {
            console.error('Error saving division:', error);
            setError(error.message || 'Error saving division');
        }
    };

    const handleDelete = async (division: any) => {
        if (confirm(`Delete division "${division.name}"? This will also delete related enrollments.`)) {
            try {
                await deleteDivision(division.id);
            } catch (error) {
                console.error('Error deleting division:', error);
                alert('Error deleting division: ' + error);
            }
        }
    };

    const startEdit = (division: any) => {
        setEditingDivision(division);
        setFormData({
            name: division.name,
            minimum_required: division.minimum_required,
            min_grade: division.min_grade,
            max_grade: division.max_grade
        });
        setIsCreating(true);
        setError(null);
    };

    const handleRecalculateBoundaries = async () => {
        try {
            await recalculateMinimumBoundaries(yearId);
            alert('Minimum boundaries recalculated successfully');
        } catch (error) {
            console.error('Error recalculating boundaries:', error);
            alert('Error recalculating boundaries: ' + error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Divisions - {yearLabel}</CardTitle>
                        <CardDescription>Manage grade-based divisions with non-overlapping ranges</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline"
                            onClick={handleRecalculateBoundaries}
                        >
                            <Calculator className="h-4 w-4 mr-2" />
                            Recalculate Boundaries
                        </Button>
                        <Button 
                            onClick={() => setIsCreating(true)}
                            disabled={isCreating}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Division
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {isCreating && (
                    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="division-name">Division Name</Label>
                                <Input
                                    id="division-name"
                                    placeholder="e.g., Primary, Junior, Senior"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="minimum-required">Minimum Required</Label>
                                <Input
                                    id="minimum-required"
                                    type="number"
                                    min="0"
                                    value={formData.minimum_required}
                                    onChange={(e) => setFormData({...formData, minimum_required: parseInt(e.target.value) || 0})}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="min-grade">
                                    Minimum Grade ({gradeCodeToLabel(formData.min_grade)})
                                </Label>
                                <Select
                                    value={formData.min_grade.toString()}
                                    onValueChange={(value) => setFormData({...formData, min_grade: parseInt(value)})}
                                >
                                    <SelectTrigger id="min-grade">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 13 }, (_, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {gradeCodeToLabel(i)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="max-grade">
                                    Maximum Grade ({gradeCodeToLabel(formData.max_grade)})
                                </Label>
                                <Select
                                    value={formData.max_grade.toString()}
                                    onValueChange={(value) => setFormData({...formData, max_grade: parseInt(value)})}
                                >
                                    <SelectTrigger id="max-grade">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 13 }, (_, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {gradeCodeToLabel(i)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">
                                {editingDivision ? 'Update' : 'Create'}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    setIsCreating(false);
                                    setEditingDivision(null);
                                    setFormData({ name: '', minimum_required: 0, min_grade: 0, max_grade: 12 });
                                    setError(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}

                {divisions && divisions.length > 0 ? (
                    <div className="space-y-2">
                        {divisions.map(division => (
                            <div key={division.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="space-y-1">
                                    <h3 className="font-medium">{division.name}</h3>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <div>
                                            Grade Range: {gradeCodeToLabel(division.min_grade)} - {gradeCodeToLabel(division.max_grade)}
                                        </div>
                                        <div>
                                            Minimum Required: {division.minimum_required} scriptures
                                        </div>
                                        {division.min_last_order !== undefined && (
                                            <div>
                                                Minimum Boundary: Order #{division.min_last_order}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startEdit(division)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(division)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        No divisions created yet
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Placeholder components - will implement these in next phases
function ScriptureManagement({ yearId, yearLabel }: { yearId: string; yearLabel: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Scriptures - {yearLabel}</CardTitle>
                <CardDescription>Manage scriptures, CSV import, and JSON text uploads</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                    Scripture management coming in Phase 4
                </div>
            </CardContent>
        </Card>
    );
}

function EssayManagement({ yearId, yearLabel, essayPrompts, divisions }: {
    yearId: string;
    yearLabel: string;
    essayPrompts: any[];
    divisions: any[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Essay Prompts - {yearLabel}</CardTitle>
                <CardDescription>Manage essay prompts for different divisions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                    Essay management coming in Phase 4
                </div>
            </CardContent>
        </Card>
    );
}

function EnrollmentManagement({ yearId, yearLabel, divisions }: {
    yearId: string;
    yearLabel: string;
    divisions: any[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Auto-Enrollment - {yearLabel}</CardTitle>
                <CardDescription>Preview and commit automatic enrollment based on grade ranges</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                    Auto-enrollment management coming in Phase 4
                </div>
            </CardContent>
        </Card>
    );
}

function OverrideManagement({ yearId, yearLabel, divisions }: {
    yearId: string;
    yearLabel: string;
    divisions: any[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual Overrides - {yearLabel}</CardTitle>
                <CardDescription>Manually assign children to specific divisions</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                    Override management coming in Phase 4
                </div>
            </CardContent>
        </Card>
    );
}