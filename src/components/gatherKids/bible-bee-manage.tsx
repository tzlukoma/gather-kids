'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Division, GradeRule } from '@/lib/types';
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
	updateEnrollmentOverride,
	deleteEnrollmentOverride,
	deleteEnrollmentOverrideByChild,
	recalculateMinimumBoundaries,
	commitEnhancedCsvRowsToYear,
	validateJsonTextUpload,
	uploadJsonTexts,
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
import { Badge } from '@/components/ui/badge';
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	Plus,
	Edit2,
	Trash2,
	Users,
	FileText,
	Upload,
	Calculator,
	AlertTriangle,
	CheckCircle,
	HelpCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface BibleBeeManageProps {
	className?: string;
}

// Module-level helper to normalize mixed-type active flags
function isActiveValue(v: unknown): boolean {
	return v === true || v === 1 || String(v) === '1' || String(v) === 'true';
}

export default function BibleBeeManage({ className }: BibleBeeManageProps) {
	const [activeTab, setActiveTab] = useState('years');
	const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

	// Load new schema Bible Bee years
	const bibleBeeYears = useLiveQuery(
		() => db.bible_bee_years.orderBy('label').toArray(),
		[]
	);

	// Load old schema competition years as fallback
	const competitionYears = useLiveQuery(
		() => db.competitionYears.orderBy('year').reverse().toArray(),
		[]
	);

	// Create combined years list (new schema first, then bridge old schema)
	const allYears = React.useMemo(() => {
		const years: any[] = [];

		// Add new schema years
		if (bibleBeeYears) {
			years.push(...bibleBeeYears);
		}

		// Check if there are any active new schema years
		const hasActiveNewYear = bibleBeeYears?.some((y) => y.is_active) || false;

		// Always add old schema years as bridge data (not just when no new years exist)
		if (competitionYears) {
			const bridgeYears = competitionYears.map((cy) => ({
				id: cy.id,
				label: `${cy.name || cy.year} (Legacy)`,
				description: cy.description || `Legacy competition year ${cy.year}`,
				start_date: cy.opensAt,
				end_date: cy.closesAt,
				// Only make legacy year active if no new schema years are active
				is_active: !hasActiveNewYear && cy.year === 2025,
				created_at: cy.createdAt,
				updated_at: cy.updatedAt,
				_isLegacy: true, // Flag to identify bridged data
			}));
			years.push(...bridgeYears);
		}

		return years;
	}, [bibleBeeYears, competitionYears]);

	const divisions = useLiveQuery(async () => {
		if (!selectedYearId) return [];

		// First try new schema
		const newDivisions = await (async () => {
			// Avoid using .where('year_id').equals(...) directly which can throw
			// IDBKeyRange errors if the stored values are mixed types. Do a safe
			// scan and filter in JS.
			const all = await db.divisions.toArray();
			return all.filter((d) => d && d.year_id === selectedYearId);
		})();

		// If we found divisions in new schema, return them
		if (newDivisions.length > 0) {
			return newDivisions;
		}

		// For legacy years, bridge from gradeRules
		const legacyGradeRules = await db.gradeRules
			.where('competitionYearId')
			.equals(selectedYearId)
			.and((rule: GradeRule) => rule.type === 'scripture') // Only scripture rules define divisions
			.toArray();

		// Convert legacy gradeRules to Division format
		return legacyGradeRules.map(
			(rule: GradeRule, index: number): Division => ({
				id: `legacy-division-${rule.id}`,
				year_id: selectedYearId,
				name: `Grades ${rule.minGrade}-${rule.maxGrade}`,
				minimum_required: rule.targetCount || 0,
				min_last_order: undefined,
				min_grade: rule.minGrade,
				max_grade: rule.maxGrade,
				created_at: rule.createdAt,
				updated_at: rule.updatedAt,
			})
		);
	}, [selectedYearId]);

	const essayPrompts = useLiveQuery(
		async () =>
			selectedYearId
				? await db.essay_prompts
						.where('year_id')
						.equals(selectedYearId)
						.toArray()
				: [],
		[selectedYearId]
	);

	// Get the active year for default selection
	React.useEffect(() => {
		if (allYears && allYears.length > 0 && !selectedYearId) {
			const activeYear = allYears.find((y) => y.is_active) || allYears[0];
			setSelectedYearId(activeYear.id);
		}
	}, [allYears, selectedYearId]);

	const selectedYear = allYears?.find((y) => y.id === selectedYearId);

	// Auto-run repro when ?repro is present (dev only)
	React.useEffect(() => {
		if (process.env.NODE_ENV === 'production') return;
		try {
			const params = new URLSearchParams(window.location.search);
			if (params.has('repro')) {
				(async () => {
					try {
						console.log('Auto-repro: creating active Bible Bee year...');
						// Get the active cycle to link to this Bible Bee year
						const activeCycle = (await db.registration_cycles.toArray()).find(
							(c) => {
								const val = c.is_active;
								return val === true || Number(val) === 1 || String(val) === '1';
							}
						);

						const created = await createBibleBeeYear({
							label: 'Auto Repro Year',
							is_active: true,
							cycle_id: activeCycle?.cycle_id || '', // Use active cycle if available
						});
						setSelectedYearId(created.id);
						setActiveTab('enrollment');
						console.log(
							'Auto-repro: calling previewAutoEnrollment for year',
							created.id
						);
						const preview = await previewAutoEnrollment(created.id);
						console.log('Auto-repro: preview result', preview);
					} catch (err) {
						console.error('Auto-repro error:', err);
					}
				})();
			}
		} catch (err) {
			// Ignore in non-browser contexts
		}
	}, []);

	return (
		<TooltipProvider>
			<div className={className}>
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-bold">Bible Bee Management</h1>
						<p className="text-muted-foreground">
							Configure competition years, divisions, and enrollment
						</p>
					</div>

					{/* Dev-only repro helper: creates an active year, opens Enrollment tab, and
					    calls previewAutoEnrollment to capture errors in the browser console. */}
					{process.env.NODE_ENV !== 'production' && (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={async () => {
									try {
										console.log(
											'Repro helper: creating active Bible Bee year...'
										);
										// Get the active cycle to link to this Bible Bee year
										const activeCycle = (
											await db.registration_cycles.toArray()
										).find((c) => {
											const val = c.is_active;
											return (
												val === true || Number(val) === 1 || String(val) === '1'
											);
										});

										const created = await createBibleBeeYear({
											label: 'Repro Test Year',
											is_active: true,
											cycle_id: activeCycle?.cycle_id || '', // Use active cycle if available
										});
										setSelectedYearId(created.id);
										setActiveTab('enrollment');
										console.log(
											'Repro helper: calling previewAutoEnrollment for year',
											created.id
										);
										const preview = await previewAutoEnrollment(created.id);
										console.log('Repro helper: preview result', preview);
									} catch (err) {
										console.error('Repro helper error:', err);
									}
								}}>
								Run Repro
							</Button>
						</div>
					)}

					{/* Year Selector */}
					<div className="flex items-center gap-4">
						<Label htmlFor="year-select">Active Year:</Label>
						<Select
							value={selectedYearId || undefined}
							onValueChange={setSelectedYearId}>
							<SelectTrigger className="w-48" id="year-select">
								<SelectValue placeholder="Select year..." />
							</SelectTrigger>
							<SelectContent>
								{allYears?.map((year) => (
									<SelectItem key={year.id} value={year.id}>
										{year.label} {year.is_active && '(Active)'}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="space-y-6">
					<TabsList className="grid w-full grid-cols-6">
						<TabsTrigger value="years">Years</TabsTrigger>
						<TabsTrigger value="divisions">Divisions</TabsTrigger>
						<TabsTrigger value="scriptures">Scriptures</TabsTrigger>
						<TabsTrigger value="essays">Essays</TabsTrigger>
						<TabsTrigger value="enrollment">Enrollment</TabsTrigger>
						<TabsTrigger value="overrides">Overrides</TabsTrigger>
					</TabsList>

					<TabsContent value="years">
						<YearManagement
							allYears={allYears}
							onYearCreated={(yearId: string) => setSelectedYearId(yearId)}
						/>
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
		</TooltipProvider>
	);
}

// Year Management Component
function YearManagement({
	allYears,
	onYearCreated,
}: {
	allYears: any[];
	onYearCreated?: (yearId: string) => void;
}) {
	const [isCreating, setIsCreating] = useState(false);
	const [editingYear, setEditingYear] = useState<any>(null);
	const [formData, setFormData] = useState({
		label: '',
		is_active: false,
		cycle_id: '',
	});

	// Query registration cycles for the dropdown
	const registrationCycles = useLiveQuery(
		() =>
			db.registration_cycles
				.toArray()
				.then((data) =>
					data.sort((a, b) => a.cycle_id.localeCompare(b.cycle_id))
				),
		[]
	);

	// Remove individual bibleBeeYears query since we get data from props

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let createdYear;
			if (editingYear) {
				await updateBibleBeeYear(editingYear.id, formData);
				setEditingYear(null);
			} else {
				createdYear = await createBibleBeeYear(formData);
				setIsCreating(false);
			}

			// If we created a new active year, automatically select it
			// Pass the created year up to the parent component
			if (createdYear && formData.is_active && onYearCreated) {
				onYearCreated(createdYear.id);
			}

			setFormData({ label: '', is_active: false, cycle_id: '' });
		} catch (error) {
			console.error('Error saving year:', error);
			alert('Error saving year: ' + error);
		}
	};

	const handleDelete = async (year: any) => {
		if (
			confirm(
				`Delete year "${year.label}"? This will also delete all divisions, enrollments, and overrides.`
			)
		) {
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
			is_active: year.is_active,
			cycle_id: year.cycle_id || '',
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
					<Button onClick={() => setIsCreating(true)} disabled={isCreating}>
						<Plus className="h-4 w-4 mr-2" />
						Add Year
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{isCreating && (
					<form
						onSubmit={handleSubmit}
						className="space-y-4 p-4 border rounded-lg">
						<div>
							<Label htmlFor="year-label">Year Label</Label>
							<Input
								id="year-label"
								placeholder="e.g., 2025–2026"
								value={formData.label}
								onChange={(e) =>
									setFormData({ ...formData, label: e.target.value })
								}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cycle-id">Registration Cycle</Label>
							<select
								id="cycle-id"
								className="w-full px-3 py-2 border rounded-md"
								value={formData.cycle_id}
								onChange={(e) =>
									setFormData({ ...formData, cycle_id: e.target.value })
								}
								required>
								<option value="">Select a registration cycle</option>
								{registrationCycles?.map((cycle) => (
									<option key={cycle.cycle_id} value={cycle.cycle_id}>
										{cycle.cycle_id} ({cycle.is_active ? 'Active' : 'Inactive'})
									</option>
								))}
							</select>
							{!registrationCycles?.length && (
								<p className="text-sm text-yellow-600">
									No registration cycles found. Please create one first.
								</p>
							)}
						</div>
						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="is-active"
								checked={formData.is_active}
								onChange={(e) =>
									setFormData({ ...formData, is_active: e.target.checked })
								}
								className="rounded"
							/>
							<Label htmlFor="is-active">Active Year</Label>
						</div>
						<div className="flex gap-2">
							<Button type="submit">{editingYear ? 'Update' : 'Create'}</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreating(false);
									setEditingYear(null);
									setFormData({ label: '', is_active: false, cycle_id: '' });
								}}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{allYears && allYears.length > 0 ? (
					<div className="space-y-2">
						{allYears.map((year) => (
							<div
								key={year.id}
								className="flex items-center justify-between p-3 border rounded-lg">
								<div>
									<h3 className="font-medium">{year.label}</h3>
									<div className="flex flex-wrap gap-1 mt-1">
										{year.is_active && <Badge variant="default">Active</Badge>}
										{year._isLegacy && <Badge variant="outline">Legacy</Badge>}
										{year.cycle_id && (
											<Badge variant="outline" className="bg-blue-50">
												Cycle: {year.cycle_id}
											</Badge>
										)}
										{!year._isLegacy && !year.cycle_id && (
											<Badge
												variant="outline"
												className="bg-yellow-50 text-yellow-800">
												No Cycle Linked
											</Badge>
										)}
									</div>
								</div>
								<div className="flex gap-2">
									{!year._isLegacy && (
										<>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => startEdit(year)}>
												<Edit2 className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleDelete(year)}>
												<Trash2 className="h-4 w-4" />
											</Button>
										</>
									)}
									{year._isLegacy && (
										<Badge variant="secondary" className="text-xs">
											Read-only
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						No Bible Bee years or legacy competition years found
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// Division Management Component
function DivisionManagement({
	yearId,
	yearLabel,
	divisions,
}: {
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
		max_grade: 12,
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
			setFormData({
				name: '',
				minimum_required: 0,
				min_grade: 0,
				max_grade: 12,
			});
		} catch (error: any) {
			console.error('Error saving division:', error);
			setError(error.message || 'Error saving division');
		}
	};

	const handleDelete = async (division: any) => {
		if (
			confirm(
				`Delete division "${division.name}"? This will also delete related enrollments.`
			)
		) {
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
			max_grade: division.max_grade,
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
						<CardDescription>
							Manage grade-based divisions with non-overlapping ranges
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleRecalculateBoundaries}>
							<Calculator className="h-4 w-4 mr-2" />
							Recalculate Boundaries
						</Button>
						<Button onClick={() => setIsCreating(true)} disabled={isCreating}>
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
					<form
						onSubmit={handleSubmit}
						className="space-y-4 p-4 border rounded-lg">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="division-name">Division Name</Label>
								<Input
									id="division-name"
									placeholder="e.g., Primary, Junior, Senior"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
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
									onChange={(e) =>
										setFormData({
											...formData,
											minimum_required: parseInt(e.target.value) || 0,
										})
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="min-grade">
									Minimum Grade ({gradeCodeToLabel(formData.min_grade)})
								</Label>
								<Select
									value={formData.min_grade.toString()}
									onValueChange={(value) =>
										setFormData({ ...formData, min_grade: parseInt(value) })
									}>
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
									onValueChange={(value) =>
										setFormData({ ...formData, max_grade: parseInt(value) })
									}>
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
									setFormData({
										name: '',
										minimum_required: 0,
										min_grade: 0,
										max_grade: 12,
									});
									setError(null);
								}}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{divisions && divisions.length > 0 ? (
					<div className="space-y-2">
						{divisions.map((division) => (
							<div
								key={division.id}
								className="flex items-center justify-between p-3 border rounded-lg">
								<div className="space-y-1">
									<h3 className="font-medium">{division.name}</h3>
									<div className="text-sm text-muted-foreground space-y-1">
										<div>
											Grade Range: {gradeCodeToLabel(division.min_grade)} -{' '}
											{gradeCodeToLabel(division.max_grade)}
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
										onClick={() => startEdit(division)}>
										<Edit2 className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(division)}>
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
function ScriptureManagement({
	yearId,
	yearLabel,
}: {
	yearId: string;
	yearLabel: string;
}) {
	const { toast } = useToast();
	const [isCreating, setIsCreating] = useState(false);
	const [editingScripture, setEditingScripture] = useState<any>(null);
	const [showCsvImport, setShowCsvImport] = useState(false);
	const [showJsonUpload, setShowJsonUpload] = useState(false);
	const [formData, setFormData] = useState({
		scripture_number: '',
		scripture_order: 1,
		counts_for: 1,
		reference: '',
		category: '',
		texts: {
			NIV: '',
			KJV: '',
			'NIV-ES': '',
		},
	});
	const [error, setError] = useState<string | null>(null);
	const [csvFile, setCsvFile] = useState<File | null>(null);
	const [csvPreview, setCsvPreview] = useState<any[]>([]);
	const [jsonFile, setJsonFile] = useState<File | null>(null);
	const [jsonPreview, setJsonPreview] = useState<any>(null);
	const [jsonMode, setJsonMode] = useState<'merge' | 'overwrite'>('merge');

	// Load scriptures for this year
	const scriptures = useLiveQuery(async () => {
		try {
			console.log('Loading scriptures for year:', yearId);
			const result = await db.scriptures
				.where('year_id')
				.equals(yearId)
				.sortBy('scripture_order');
			console.log(`Found ${result.length} scriptures for year ${yearId}`);
			return result;
		} catch (error) {
			console.error('Error loading scriptures:', error);
			return [];
		}
	}, [yearId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			const scriptureData = {
				...formData,
				year_id: yearId,
				scripture_order: Number(formData.scripture_order),
				counts_for: Number(formData.counts_for),
				// Store texts object with non-empty translations
				texts: Object.fromEntries(
					Object.entries(formData.texts).filter(
						([_, text]) => text.trim() !== ''
					)
				),
				// Legacy fields for backward compatibility
				text:
					formData.texts.NIV ||
					formData.texts.KJV ||
					formData.texts['NIV-ES'] ||
					'',
				translation: 'NIV',
				competitionYearId: '', // Legacy field
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			if (editingScripture) {
				await db.scriptures.put({ ...editingScripture, ...scriptureData });
				toast({
					title: `Scripture ${formData.scripture_number} Updated`,
					description: 'Scripture has been successfully updated.',
				});
				setEditingScripture(null);
				setIsCreating(false);
			} else {
				await db.scriptures.put({
					id: crypto.randomUUID(),
					...scriptureData,
				});
				toast({
					title: `Scripture ${formData.scripture_number} Created`,
					description: 'Scripture has been successfully created.',
				});
				setIsCreating(false);
			}
			setFormData({
				scripture_number: '',
				scripture_order: 1,
				counts_for: 1,
				reference: '',
				category: '',
				texts: {
					NIV: '',
					KJV: '',
					'NIV-ES': '',
				},
			});
		} catch (error: any) {
			console.error('Error saving scripture:', error);
			setError(error.message || 'Error saving scripture');
		}
	};

	const handleDelete = async (scripture: any) => {
		if (confirm(`Delete scripture "${scripture.scripture_number}"?`)) {
			try {
				await db.scriptures.delete(scripture.id);
				toast({
					title: `Scripture ${scripture.scripture_number} Deleted`,
					description: 'Scripture has been successfully deleted.',
				});
			} catch (error: any) {
				console.error('Error deleting scripture:', error);
				setError(error.message || 'Error deleting scripture');
			}
		}
	};

	const startEdit = (scripture: any) => {
		setEditingScripture(scripture);
		setFormData({
			scripture_number: scripture.scripture_number || '',
			scripture_order: scripture.scripture_order || 1,
			counts_for: scripture.counts_for || 1,
			reference: scripture.reference || '',
			category: scripture.category || '',
			texts: {
				NIV: scripture.texts?.NIV || '',
				KJV: scripture.texts?.KJV || '',
				'NIV-ES': scripture.texts?.['NIV-ES'] || '',
			},
		});
		setIsCreating(true);
		setError(null);
	};

	const handleRecalculateBoundaries = async () => {
		try {
			await recalculateMinimumBoundaries(yearId);
			toast({
				title: 'Boundaries Recalculated',
				description: 'Minimum boundaries have been successfully recalculated.',
			});
		} catch (error: any) {
			console.error('Error recalculating boundaries:', error);
			setError(error.message || 'Error recalculating boundaries');
		}
	};

	const handleCsvUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const lines = text.split('\n').filter((line) => line.trim());
			const headers = lines[0].split(',').map((h) => h.trim());

			const preview = lines.slice(1).map((line, index) => {
				const values = line.split(',').map((v) => v.trim());
				const row: any = {};
				headers.forEach((header, i) => {
					if (header === 'scripture_order')
						row[header] = parseInt(values[i]) || 0;
					else if (header === 'counts_for')
						row[header] = parseInt(values[i]) || 1;
					else row[header] = values[i] || '';
				});
				return { ...row, _rowIndex: index + 2 };
			});

			setCsvFile(file);
			setCsvPreview(preview);

			// Check if there are existing texts for the references in this CSV
			// This helps identify if there will be references without text content
			const normalizeReference = (s?: string | null) =>
				(s ?? '')
					.toString()
					.trim()
					.replace(/\s+/g, ' ')
					.replace(/[^\w\d\s:\-]/g, '')
					.toLowerCase();

			// Get all existing scriptures for this year
			const existingScriptures = await db.scriptures
				.where('year_id')
				.equals(yearId)
				.toArray();

			// Track references with missing texts and their details
			const referencesWithoutTexts = preview.filter((row) => {
				const normalizedRef = normalizeReference(row.reference);
				const matchingScripture = existingScriptures.find(
					(s) => normalizeReference(s.reference) === normalizedRef
				);

				// Debug log for James 2:17 specifically to help track down the issue
				if (row.reference && row.reference.includes('James 2:17')) {
					console.log('DEBUG James 2:17:', {
						row,
						normalizedRef,
						foundMatch: matchingScripture ? true : false,
						matchDetails: matchingScripture
							? {
									id: matchingScripture.id,
									ref: matchingScripture.reference,
									normalizedMatchRef: normalizeReference(
										matchingScripture.reference
									),
									hasTexts: !!matchingScripture.texts,
									hasText: !!matchingScripture.text,
							  }
							: null,
					});
				}

				// Check if there's no matching scripture or the scripture has no texts
				return (
					!matchingScripture ||
					(!matchingScripture.texts && !matchingScripture.text)
				);
			});

			if (referencesWithoutTexts.length > 0) {
				// Show the actual references that are missing texts (limit to first 5 for readability)
				const missingRefs = referencesWithoutTexts
					.map((r) => r.reference)
					.slice(0, 5)
					.join(', ');

				const moreCount =
					referencesWithoutTexts.length > 5
						? ` and ${referencesWithoutTexts.length - 5} more`
						: '';

				setError(
					`Warning: ${referencesWithoutTexts.length} references do not have corresponding text content: ${missingRefs}${moreCount}. Consider uploading JSON text data first or these will be imported without text content.`
				);
			} else {
				setError(null);
			}
		} catch (error: any) {
			setError('Error reading CSV file: ' + error.message);
		}
	};

	const commitCsvImport = async () => {
		if (!csvPreview.length) return;

		try {
			console.log(
				'Committing CSV import:',
				csvPreview.length,
				'records for year',
				yearId
			);
			await commitEnhancedCsvRowsToYear(csvPreview, yearId);

			toast({
				title: 'CSV Import Complete',
				description: `Successfully imported ${csvPreview.length} scripture records.`,
			});
			setCsvFile(null);
			setCsvPreview([]);
			setShowCsvImport(false);
			setError(null);

			// Check if scriptures were actually created
			const scriptureCount = await db.scriptures
				.where('year_id')
				.equals(yearId)
				.count();
			console.log(
				`Total scriptures for year ${yearId} after CSV import:`,
				scriptureCount
			);
		} catch (error: any) {
			console.error('Error importing CSV:', error);
			setError(error.message || 'Error importing CSV');
		}
	};

	const handleJsonUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			const text = await file.text();
			const data = JSON.parse(text);

			// Validate the JSON structure
			const validation = validateJsonTextUpload(data);
			if (!validation.isValid) {
				setError('Invalid JSON format: ' + validation.errors.join(', '));
				return;
			}

			// Debug log for James 2:17/Ruth 1:16 specifically
			const normalizeReference = (s?: string | null) =>
				(s ?? '')
					.toString()
					.trim()
					.replace(/\s+/g, ' ')
					.replace(/[^\w\d\s:\-]/g, '')
					.toLowerCase();

			// Check for any items with references to James 2:17 or Ruth 1:16
			data.scriptures.forEach((item: any) => {
				if (
					item.reference &&
					(item.reference.includes('James 2:17') ||
						item.reference.includes('Ruth 1:16'))
				) {
					console.log('DEBUG JSON Upload - Found:', {
						reference: item.reference,
						normalizedRef: normalizeReference(item.reference),
						texts: Object.keys(item.texts || {}),
					});
				}
			});

			setJsonFile(file);

			// Generate dry-run preview
			const preview = await uploadJsonTexts(yearId, data, jsonMode, true);
			setJsonPreview(preview);
		} catch (error: any) {
			console.error('Error reading JSON file:', error);
			setError('Error reading JSON file: ' + error.message);
		}
	};

	const commitJsonUpload = async () => {
		if (!jsonFile || !jsonPreview) return;

		try {
			const text = await jsonFile.text();
			const data = JSON.parse(text);

			const result = await uploadJsonTexts(yearId, data, jsonMode, false);

			// Force refresh the scripture list by updating the yearId dependency
			console.log('JSON upload completed:', result);

			toast({
				title: 'JSON Upload Complete',
				description: `Updated ${result.updated} scriptures, created ${result.created} new scriptures.`,
			});

			setJsonFile(null);
			setJsonPreview(null);
			setShowJsonUpload(false);
			setError(null);

			// Check if scriptures were actually created/updated
			const scriptureCount = await db.scriptures
				.where('year_id')
				.equals(yearId)
				.count();
			console.log(`Total scriptures for year ${yearId}:`, scriptureCount);
		} catch (error: any) {
			console.error('Error uploading JSON:', error);
			setError(error.message || 'Error uploading JSON');
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Scriptures - {yearLabel}</CardTitle>
						<CardDescription>
							Manage scriptures, CSV import, and JSON text uploads
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleRecalculateBoundaries}>
							<Calculator className="h-4 w-4 mr-2" />
							Recalculate Boundaries
						</Button>
						<Button variant="outline" onClick={() => setShowCsvImport(true)}>
							<Upload className="h-4 w-4 mr-2" />
							CSV Import
						</Button>
						<Button variant="outline" onClick={() => setShowJsonUpload(true)}>
							<FileText className="h-4 w-4 mr-2" />
							JSON Upload
						</Button>
						<Button onClick={() => setIsCreating(true)} disabled={isCreating}>
							<Plus className="h-4 w-4 mr-2" />
							Add Scripture
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

				{/* CSV Import Dialog */}
				<Dialog open={showCsvImport} onOpenChange={setShowCsvImport}>
					<DialogContent className="max-w-4xl">
						<DialogHeader>
							<DialogTitle>CSV Import</DialogTitle>
							<DialogDescription>
								Import scripture metadata. Expected columns: scripture_order,
								scripture_number, counts_for, reference, category
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Label htmlFor="csv-file">Select CSV File</Label>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button variant="ghost" size="sm" className="h-5 w-5 p-0">
												<HelpCircle className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent className="max-w-sm">
											<div className="text-sm">
												<strong>CSV Format Template:</strong>
												<pre className="mt-2 text-xs bg-muted p-2 rounded">
													{`scripture_order,scripture_number,counts_for,reference,category
1,"1-1",1,"Genesis 1:1","Primary"
2,"1-2",1,"Genesis 1:2","Primary"
3,"2-1",2,"Exodus 20:2-3","Primary Minimum"`}
												</pre>
												<div className="mt-2">
													<strong>Required columns:</strong> scripture_order
													(int), scripture_number (string), counts_for (int),
													reference (string). <strong>Optional:</strong>{' '}
													category (string)
												</div>
											</div>
										</TooltipContent>
									</Tooltip>
								</div>
								<Input
									id="csv-file"
									type="file"
									accept=".csv"
									onChange={handleCsvUpload}
								/>
							</div>
							{csvPreview.length > 0 && (
								<div>
									<h4 className="font-medium mb-2">
										Preview ({csvPreview.length} rows)
									</h4>
									<div className="max-h-60 overflow-auto border rounded">
										<table className="w-full text-sm">
											<thead className="bg-muted">
												<tr>
													<th className="p-2 text-left">Order</th>
													<th className="p-2 text-left">Number</th>
													<th className="p-2 text-left">Reference</th>
													<th className="p-2 text-left">Counts For</th>
													<th className="p-2 text-left">Category</th>
												</tr>
											</thead>
											<tbody>
												{csvPreview.slice(0, 10).map((row, i) => (
													<tr key={i} className="border-t">
														<td className="p-2">{row.scripture_order}</td>
														<td className="p-2">{row.scripture_number}</td>
														<td className="p-2">{row.reference}</td>
														<td className="p-2">{row.counts_for}</td>
														<td className="p-2">{row.category}</td>
													</tr>
												))}
												{csvPreview.length > 10 && (
													<tr className="border-t">
														<td
															colSpan={5}
															className="p-2 text-center text-muted-foreground">
															... and {csvPreview.length - 10} more rows
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowCsvImport(false)}>
								Cancel
							</Button>
							<Button onClick={commitCsvImport} disabled={!csvPreview.length}>
								Import {csvPreview.length} Records
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* JSON Upload Dialog */}
				<Dialog open={showJsonUpload} onOpenChange={setShowJsonUpload}>
					<DialogContent className="max-w-4xl">
						<DialogHeader>
							<DialogTitle>JSON Text Upload</DialogTitle>
							<DialogDescription>
								Upload scripture texts (NIV/KJV/NIV-ES) in JSON format
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<div className="flex items-center gap-2 mb-2">
										<Label htmlFor="json-file">Select JSON File</Label>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-5 w-5 p-0">
													<HelpCircle className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent className="max-w-md">
												<div className="text-sm">
													<strong>JSON Format Template:</strong>
													<pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
														{`{
  "competition_year": "2025-2026",
  "translations": ["NIV", "KJV", "NIV-ES"],
  "scriptures": [
    {
      "reference": "Genesis 1:1",
      "texts": {
        "NIV": "In the beginning God created...",
        "KJV": "In the beginning God created...",
        "NIV-ES": "En el principio Dios creó..."
      }
    },
    {
      "reference": "Genesis 1:2",
      "texts": {
        "NIV": "Now the earth was formless...",
        "KJV": "And the earth was without form..."
      }
    }
  ]
}`}
													</pre>
													<div className="mt-2">
														<strong>Required Fields:</strong>
														<ul className="list-disc list-inside mt-1 text-xs">
															<li>
																<code>competition_year</code> - String
																identifier
															</li>
															<li>
																<code>translations</code> - Array of supported
																translations
															</li>
															<li>
																<code>scriptures</code> - Array of scripture
																objects
															</li>
														</ul>
														<div className="mt-1 text-xs">
															Each scripture needs: <code>reference</code>{' '}
															(string), <code>texts</code> (object with
															translation keys). No order field is needed -
															references are matched by text.
														</div>
													</div>
												</div>
											</TooltipContent>
										</Tooltip>
									</div>
									<Input
										id="json-file"
										type="file"
										accept=".json"
										onChange={handleJsonUpload}
									/>
								</div>
								<div>
									<Label htmlFor="json-mode">Import Mode</Label>
									<Select
										value={jsonMode}
										onValueChange={(value: 'merge' | 'overwrite') =>
											setJsonMode(value)
										}>
										<SelectTrigger id="json-mode">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="merge">
												Merge (keep existing texts)
											</SelectItem>
											<SelectItem value="overwrite">
												Overwrite (replace all texts)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							{jsonPreview && (
								<div>
									<h4 className="font-medium mb-2">
										Preview - {jsonPreview.updated + jsonPreview.created}{' '}
										scriptures affected
									</h4>
									<div className="grid grid-cols-2 gap-4 mb-4">
										<div className="text-sm">
											<strong>Will Update:</strong> {jsonPreview.updated}{' '}
											existing scriptures
										</div>
										<div className="text-sm">
											<strong>Will Create:</strong> {jsonPreview.created} new
											scriptures
										</div>
									</div>
									{jsonPreview.preview && (
										<div className="max-h-60 overflow-auto border rounded">
											<table className="w-full text-sm">
												<thead className="bg-muted">
													<tr>
														<th className="p-2 text-left">Reference</th>
														<th className="p-2 text-left">Action</th>
														<th className="p-2 text-left">Translations</th>
													</tr>
												</thead>
												<tbody>
													{jsonPreview.preview
														.slice(0, 10)
														.map((item: any, i: number) => (
															<tr key={i} className="border-t">
																<td className="p-2">{item.reference}</td>
																<td className="p-2">
																	<Badge
																		variant={
																			item.action === 'create'
																				? 'default'
																				: 'secondary'
																		}>
																		{item.action}
																	</Badge>
																</td>
																<td className="p-2">{item.texts.join(', ')}</td>
															</tr>
														))}
													{jsonPreview.preview.length > 10 && (
														<tr className="border-t">
															<td
																colSpan={3}
																className="p-2 text-center text-muted-foreground">
																... and {jsonPreview.preview.length - 10} more
															</td>
														</tr>
													)}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}
						</div>
						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setShowJsonUpload(false)}>
								Cancel
							</Button>
							<Button onClick={commitJsonUpload} disabled={!jsonPreview}>
								Upload Texts
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Scripture Creation/Edit Form */}
				{isCreating && (
					<form
						onSubmit={handleSubmit}
						className="space-y-4 p-4 border rounded-lg">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<Label htmlFor="scripture-number">Scripture Number</Label>
								<Input
									id="scripture-number"
									placeholder="e.g., 1-2"
									value={formData.scripture_number}
									onChange={(e) =>
										setFormData({
											...formData,
											scripture_number: e.target.value,
										})
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="scripture-order">Scripture Order</Label>
								<Input
									id="scripture-order"
									type="number"
									min="1"
									value={formData.scripture_order}
									onChange={(e) =>
										setFormData({
											...formData,
											scripture_order: parseInt(e.target.value) || 1,
										})
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="counts-for">Counts For</Label>
								<Input
									id="counts-for"
									type="number"
									min="1"
									value={formData.counts_for}
									onChange={(e) =>
										setFormData({
											...formData,
											counts_for: parseInt(e.target.value) || 1,
										})
									}
									required
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="reference">Reference</Label>
								<Input
									id="reference"
									placeholder="e.g., Exodus 20:2-3"
									value={formData.reference}
									onChange={(e) =>
										setFormData({ ...formData, reference: e.target.value })
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="category">Category</Label>
								<Input
									id="category"
									placeholder="e.g., Primary Minimum, Competition"
									value={formData.category}
									onChange={(e) =>
										setFormData({ ...formData, category: e.target.value })
									}
								/>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium">Scripture Texts by Translation</h4>
							<div className="grid grid-cols-1 gap-4">
								{Object.entries(formData.texts).map(([translation, text]) => (
									<div key={translation}>
										<Label htmlFor={`text-${translation}`}>
											{translation} Text (Optional)
										</Label>
										<Textarea
											id={`text-${translation}`}
											placeholder={`Scripture text in ${translation}...`}
											value={text}
											onChange={(e) =>
												setFormData({
													...formData,
													texts: {
														...formData.texts,
														[translation]: e.target.value,
													},
												})
											}
											rows={3}
										/>
									</div>
								))}
							</div>
						</div>
						<div className="flex gap-2">
							<Button type="submit">
								{editingScripture ? 'Update' : 'Create'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreating(false);
									setEditingScripture(null);
									setFormData({
										scripture_number: '',
										scripture_order: 1,
										counts_for: 1,
										reference: '',
										category: '',
										texts: {
											NIV: '',
											KJV: '',
											'NIV-ES': '',
										},
									});
									setError(null);
								}}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{/* Scriptures List */}
				{scriptures && scriptures.length > 0 ? (
					<div className="space-y-2">
						{scriptures.map((scripture) => (
							<div
								key={scripture.id}
								className="flex items-center justify-between p-3 border rounded-lg">
								<div className="space-y-1">
									<h3 className="font-medium">
										#{scripture.scripture_number} - {scripture.reference}
									</h3>
									<div className="text-sm text-muted-foreground space-y-1">
										<div>
											Order: {scripture.scripture_order}, Counts For:{' '}
											{scripture.counts_for}
										</div>
										{scripture.category && (
											<div>Category: {scripture.category}</div>
										)}
										{scripture.texts &&
											Object.keys(scripture.texts).length > 0 && (
												<div>
													Available Texts:{' '}
													{Object.keys(scripture.texts).join(', ')}
												</div>
											)}
									</div>
								</div>
								<div className="flex gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => startEdit(scripture)}>
										<Edit2 className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(scripture)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						No scriptures created yet
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function EssayManagement({
	yearId,
	yearLabel,
	essayPrompts,
	divisions,
}: {
	yearId: string;
	yearLabel: string;
	essayPrompts: any[];
	divisions: any[];
}) {
	const { toast } = useToast();
	const [isCreating, setIsCreating] = useState(false);
	const [editingEssay, setEditingEssay] = useState<any>(null);
	const [formData, setFormData] = useState({
		division_name: 'all',
		prompt_text: '',
		due_date: '',
	});
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			const essayData = {
				...formData,
				year_id: yearId,
				division_name:
					formData.division_name === 'all' ? '' : formData.division_name,
				due_date: formData.due_date || new Date().toISOString().split('T')[0], // Default to today if not provided
			};

			if (editingEssay) {
				await updateEssayPrompt(editingEssay.id, essayData);
				toast({
					title: 'Essay Prompt Updated',
					description: 'Essay prompt has been successfully updated.',
				});
				setEditingEssay(null);
				setIsCreating(false);
			} else {
				await createEssayPrompt(essayData);
				toast({
					title: 'Essay Prompt Created',
					description: 'Essay prompt has been successfully created.',
				});
				setIsCreating(false);
			}
			setFormData({
				division_name: 'all',
				prompt_text: '',
				due_date: '',
			});
		} catch (error: any) {
			console.error('Error saving essay prompt:', error);
			setError(error.message || 'Error saving essay prompt');
		}
	};

	const handleDelete = async (essay: any) => {
		if (
			confirm(
				`Delete essay prompt for ${essay.division_name || 'All Divisions'}?`
			)
		) {
			try {
				await deleteEssayPrompt(essay.id);
				toast({
					title: 'Essay Prompt Deleted',
					description: 'Essay prompt has been successfully deleted.',
				});
			} catch (error: any) {
				console.error('Error deleting essay prompt:', error);
				setError(error.message || 'Error deleting essay prompt');
			}
		}
	};

	const startEdit = (essay: any) => {
		setEditingEssay(essay);
		setFormData({
			division_name: essay.division_name || 'all',
			prompt_text: essay.prompt_text || '',
			due_date: essay.due_date || '',
		});
		setIsCreating(true);
		setError(null);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Essay Prompts - {yearLabel}</CardTitle>
						<CardDescription>
							Manage essay prompts for different divisions
						</CardDescription>
					</div>
					<Button onClick={() => setIsCreating(true)} disabled={isCreating}>
						<Plus className="h-4 w-4 mr-2" />
						Add Essay Prompt
					</Button>
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
					<form
						onSubmit={handleSubmit}
						className="space-y-4 p-4 border rounded-lg">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<Label htmlFor="division-name">Division (Optional)</Label>
								<Select
									value={formData.division_name || 'all'}
									onValueChange={(value) =>
										setFormData({ ...formData, division_name: value })
									}>
									<SelectTrigger id="division-name">
										<SelectValue placeholder="All Divisions" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All Divisions</SelectItem>
										{divisions.map((division) => (
											<SelectItem key={division.id} value={division.name}>
												{division.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label htmlFor="due-date">Due Date (Optional)</Label>
								<Input
									id="due-date"
									type="date"
									value={formData.due_date}
									onChange={(e) =>
										setFormData({ ...formData, due_date: e.target.value })
									}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="prompt-text">Essay Prompt</Label>
							<Textarea
								id="prompt-text"
								placeholder="Enter the essay prompt text..."
								value={formData.prompt_text}
								onChange={(e) =>
									setFormData({ ...formData, prompt_text: e.target.value })
								}
								required
								rows={4}
							/>
						</div>
						<div className="flex gap-2">
							<Button type="submit">
								{editingEssay ? 'Update' : 'Create'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreating(false);
									setEditingEssay(null);
									setFormData({
										division_name: 'all',
										prompt_text: '',
										due_date: '',
									});
									setError(null);
								}}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{essayPrompts && essayPrompts.length > 0 ? (
					<div className="space-y-2">
						{essayPrompts.map((essay) => (
							<div
								key={essay.id}
								className="flex items-start justify-between p-3 border rounded-lg">
								<div className="space-y-1 flex-1">
									<h3 className="font-medium">
										{essay.division_name || 'All Divisions'}
									</h3>
									<p className="text-sm text-muted-foreground">
										{essay.prompt_text}
									</p>
									{essay.due_date && (
										<div className="text-sm text-muted-foreground">
											Due: {new Date(essay.due_date).toLocaleDateString()}
										</div>
									)}
								</div>
								<div className="flex gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => startEdit(essay)}>
										<Edit2 className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(essay)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						No essay prompts created yet
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function EnrollmentManagement({
	yearId,
	yearLabel,
	divisions,
}: {
	yearId: string;
	yearLabel: string;
	divisions: any[];
}) {
	const { toast } = useToast();
	const [preview, setPreview] = useState<any>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load preview automatically when year or divisions change
	React.useEffect(() => {
		if (yearId && divisions.length >= 0) {
			loadPreview();
		}
	}, [yearId, divisions.length]);

	const loadPreview = async () => {
		setIsLoading(true);
		setError(null);
		try {
			console.log('Loading auto-enrollment preview for year:', yearId);
			console.log('Available divisions:', divisions.length);

			// Check prerequisites - children enrolled in Bible Bee ministry
			// Use a safe scan to find the active registration cycle and tolerate
			// mixed stored representations for is_active (1, true, '1') which
			// can cause IDBKeyRange DataError when used with .equals(...)
			const allCycles = await db.registration_cycles.toArray();
			let currentCycle = allCycles.find((c) => isActiveValue(c?.is_active));
			if (!currentCycle) {
				setError(
					'No active registration cycle found. Please contact an administrator.'
				);
				setIsLoading(false);
				return;
			}

			const bibleBeeMinistry = await db.ministries
				.where('code')
				.equals('bible-bee')
				.first();
			if (!bibleBeeMinistry) {
				setError(
					'Bible Bee ministry not found. Please contact an administrator.'
				);
				setIsLoading(false);
				return;
			}

			// Avoid using a compound .equals([...]) query which can throw when stored
			// key types are mixed (string vs number). Do a safe scan and filter in JS.
			const allEnrollments = await db.ministry_enrollments.toArray();
			const bibleBeeEnrollments = allEnrollments.filter((e: any) => {
				try {
					return (
						String(e.cycle_id) === String(currentCycle.cycle_id) &&
						String(e.ministry_id) === String(bibleBeeMinistry.ministry_id) &&
						e.status === 'enrolled'
					);
				} catch (err) {
					return false;
				}
			}).length;

			console.log('Children enrolled in Bible Bee:', bibleBeeEnrollments);

			if (bibleBeeEnrollments === 0) {
				setError(
					'No children enrolled in Bible Bee ministry for the current registration cycle. Please ensure children are enrolled in Bible Bee ministry.'
				);
				setIsLoading(false);
				return;
			}

			if (divisions.length === 0) {
				setError(
					'No divisions found for this year. Please create divisions first.'
				);
				setIsLoading(false);
				return;
			}

			const previewData = await previewAutoEnrollment(yearId);
			console.log('Preview data:', previewData);
			setPreview(previewData);
		} catch (error: any) {
			console.error('Error loading preview:', error);
			setError(error.message || 'Error loading enrollment preview');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCommit = async () => {
		if (!preview) return;

		setIsLoading(true);
		setError(null);
		try {
			const result = await commitAutoEnrollment(yearId);
			toast({
				title: 'Auto-Enrollment Complete',
				description: `Enrolled ${result.enrolled} children, applied ${result.overrides_applied} overrides.`,
			});
			if (result.errors.length > 0) {
				setError('Some enrollments failed: ' + result.errors.join(', '));
			}
			// Refresh preview
			await loadPreview();
		} catch (error: any) {
			console.error('Error committing enrollment:', error);
			setError(error.message || 'Error committing enrollment');
		} finally {
			setIsLoading(false);
		}
	};

	// Load preview on mount
	React.useEffect(() => {
		if (yearId) {
			loadPreview();
		}
	}, [yearId]);

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'proposed':
				return <Badge variant="default">Proposed</Badge>;
			case 'override':
				return <Badge variant="secondary">Override</Badge>;
			case 'unassigned':
				return <Badge variant="destructive">Unassigned</Badge>;
			case 'unknown_grade':
				return <Badge variant="outline">Unknown Grade</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Auto-Enrollment - {yearLabel}</CardTitle>
						<CardDescription>
							Preview and commit automatic enrollment based on grade ranges
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={loadPreview}
							disabled={isLoading}>
							<Users className="h-4 w-4 mr-2" />
							Refresh Preview
						</Button>
						<Button
							onClick={handleCommit}
							disabled={isLoading || !preview || preview.counts.proposed === 0}>
							<CheckCircle className="h-4 w-4 mr-2" />
							Commit Enrollment
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

				{isLoading && (
					<div className="text-center py-8 text-muted-foreground">
						Loading enrollment preview...
					</div>
				)}

				{preview && !isLoading && (
					<div className="space-y-4">
						{/* Summary Cards */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Card>
								<CardContent className="p-4 text-center">
									<div className="text-2xl font-bold text-green-600">
										{preview.counts.proposed}
									</div>
									<div className="text-sm text-muted-foreground">Proposed</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="p-4 text-center">
									<div className="text-2xl font-bold text-blue-600">
										{preview.counts.overrides}
									</div>
									<div className="text-sm text-muted-foreground">Overrides</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="p-4 text-center">
									<div className="text-2xl font-bold text-red-600">
										{preview.counts.unassigned}
									</div>
									<div className="text-sm text-muted-foreground">
										Unassigned
									</div>
								</CardContent>
							</Card>
							<Card>
								<CardContent className="p-4 text-center">
									<div className="text-2xl font-bold text-yellow-600">
										{preview.counts.unknown_grade}
									</div>
									<div className="text-sm text-muted-foreground">
										Unknown Grade
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Detailed Preview */}
						<div>
							<h4 className="font-medium mb-2">
								Enrollment Preview ({preview.previews.length} children)
							</h4>
							<div className="max-h-96 overflow-auto border rounded">
								<table className="w-full text-sm">
									<thead className="bg-muted sticky top-0">
										<tr>
											<th className="p-2 text-left">Child Name</th>
											<th className="p-2 text-left">Grade</th>
											<th className="p-2 text-left">Status</th>
											<th className="p-2 text-left">Assigned Division</th>
											<th className="p-2 text-left">Notes</th>
										</tr>
									</thead>
									<tbody>
										{preview.previews.map((child: any) => (
											<tr key={child.child_id} className="border-t">
												<td className="p-2 font-medium">{child.child_name}</td>
												<td className="p-2">{child.grade_text}</td>
												<td className="p-2">{getStatusBadge(child.status)}</td>
												<td className="p-2">
													{child.override_division?.name ||
														child.proposed_division?.name ||
														'-'}
												</td>
												<td className="p-2 text-muted-foreground">
													{child.override_division?.reason || ''}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				)}

				{!preview && !isLoading && (
					<div className="text-center py-8 text-muted-foreground">
						Click "Refresh Preview" to see enrollment preview
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function OverrideManagement({
	yearId,
	yearLabel,
	divisions,
}: {
	yearId: string;
	yearLabel: string;
	divisions: any[];
}) {
	const { toast } = useToast();
	const [isCreating, setIsCreating] = useState(false);
	const [editingOverride, setEditingOverride] = useState<any>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedChild, setSelectedChild] = useState<any>(null);
	const [formData, setFormData] = useState({
		division_id: '',
		reason: '',
	});
	const [error, setError] = useState<string | null>(null);

	// Load data - be tolerant of mixed-type is_active values (1 vs true)
	const children = useLiveQuery(async () => {
		const all = await db.children.toArray();
		return all.filter((c) => !!c && isActiveValue(c?.is_active));
	}, []);

	const overrides = useLiveQuery(
		async () =>
			await db.enrollment_overrides.where('year_id').equals(yearId).toArray(),
		[yearId]
	);

	// Get child details for overrides
	const enrichedOverrides = React.useMemo(() => {
		if (!overrides || !children) return [];

		return overrides.map((override) => {
			const child = children.find((c) => c.child_id === override.child_id);
			const division = divisions.find((d) => d.id === override.division_id);
			return {
				...override,
				child_name: child
					? `${child.first_name} ${child.last_name}`
					: 'Unknown Child',
				child_grade: child?.grade || '',
				division_name: division?.name || 'Unknown Division',
			};
		});
	}, [overrides, children, divisions]);

	// Filter children for search
	const filteredChildren = React.useMemo(() => {
		if (!children || !searchTerm) return [];

		const term = searchTerm.toLowerCase();
		return children.filter(
			(child) =>
				`${child.first_name} ${child.last_name}`.toLowerCase().includes(term) ||
				child.first_name.toLowerCase().includes(term) ||
				child.last_name.toLowerCase().includes(term)
		);
	}, [children, searchTerm]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedChild) return;

		setError(null);
		try {
			const overrideData = {
				year_id: yearId,
				child_id: selectedChild.child_id,
				division_id: formData.division_id,
				reason: formData.reason,
				created_by: 'admin', // TODO: Get from auth context
			};

			if (editingOverride) {
				await updateEnrollmentOverride(editingOverride.id, overrideData);
				toast({
					title: 'Override Updated',
					description: `Override for ${selectedChild.first_name} ${selectedChild.last_name} has been updated.`,
				});
			} else {
				// Delete existing override first (if any)
				await deleteEnrollmentOverrideByChild(yearId, selectedChild.child_id);
				// Create new override
				await createEnrollmentOverride(overrideData);
				toast({
					title: 'Override Created',
					description: `Override for ${selectedChild.first_name} ${selectedChild.last_name} has been created.`,
				});
			}

			setIsCreating(false);
			setEditingOverride(null);
			setSelectedChild(null);
			setFormData({ division_id: '', reason: '' });
			setSearchTerm('');
		} catch (error: any) {
			console.error('Error saving override:', error);
			setError(error.message || 'Error saving override');
		}
	};

	const handleDelete = async (override: any) => {
		if (confirm(`Delete override for ${override.child_name}?`)) {
			try {
				await deleteEnrollmentOverride(override.id);
				toast({
					title: 'Override Deleted',
					description: `Override for ${override.child_name} has been deleted.`,
				});
			} catch (error: any) {
				console.error('Error deleting override:', error);
				setError(error.message || 'Error deleting override');
			}
		}
	};

	const startEdit = (override: any) => {
		const child = children?.find((c) => c.child_id === override.child_id);
		setEditingOverride(override);
		setSelectedChild(child);
		setFormData({
			division_id: override.division_id,
			reason: override.reason || '',
		});
		setIsCreating(true);
		setError(null);
	};

	const selectChild = (child: any) => {
		setSelectedChild(child);
		setSearchTerm(`${child.first_name} ${child.last_name}`);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Manual Overrides - {yearLabel}</CardTitle>
						<CardDescription>
							Manually assign children to specific divisions
						</CardDescription>
					</div>
					<Button onClick={() => setIsCreating(true)} disabled={isCreating}>
						<Plus className="h-4 w-4 mr-2" />
						Add Override
					</Button>
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
					<form
						onSubmit={handleSubmit}
						className="space-y-4 p-4 border rounded-lg">
						<div>
							<Label htmlFor="child-search">Search Child</Label>
							<Input
								id="child-search"
								placeholder="Start typing child's name..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								disabled={!!editingOverride}
							/>
							{searchTerm && !selectedChild && filteredChildren.length > 0 && (
								<div className="mt-2 max-h-32 overflow-auto border rounded">
									{filteredChildren.slice(0, 10).map((child) => (
										<div
											key={child.child_id}
											className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
											onClick={() => selectChild(child)}>
											<div className="font-medium">
												{child.first_name} {child.last_name}
											</div>
											<div className="text-sm text-muted-foreground">
												Grade: {child.grade || 'Unknown'}
											</div>
										</div>
									))}
									{filteredChildren.length > 10 && (
										<div className="p-2 text-center text-muted-foreground text-sm">
											... and {filteredChildren.length - 10} more matches
										</div>
									)}
								</div>
							)}
							{selectedChild && (
								<div className="mt-2 p-2 bg-muted rounded flex items-center justify-between">
									<div>
										<div className="font-medium">
											{selectedChild.first_name} {selectedChild.last_name}
										</div>
										<div className="text-sm text-muted-foreground">
											Grade: {selectedChild.grade || 'Unknown'}
										</div>
									</div>
									{!editingOverride && (
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setSelectedChild(null);
												setSearchTerm('');
											}}>
											✕
										</Button>
									)}
								</div>
							)}
						</div>

						<div>
							<Label htmlFor="division-select">Target Division</Label>
							<Select
								value={formData.division_id || undefined}
								onValueChange={(value) =>
									setFormData({ ...formData, division_id: value })
								}>
								<SelectTrigger id="division-select">
									<SelectValue placeholder="Select division..." />
								</SelectTrigger>
								<SelectContent>
									{divisions.map((division) => (
										<SelectItem key={division.id} value={division.id}>
											{division.name} ({gradeCodeToLabel(division.min_grade)} -{' '}
											{gradeCodeToLabel(division.max_grade)})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="reason">Reason (Optional)</Label>
							<Textarea
								id="reason"
								placeholder="Reason for manual override..."
								value={formData.reason}
								onChange={(e) =>
									setFormData({ ...formData, reason: e.target.value })
								}
								rows={3}
							/>
						</div>

						<div className="flex gap-2">
							<Button
								type="submit"
								disabled={!selectedChild || !formData.division_id}>
								{editingOverride ? 'Update' : 'Create'} Override
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreating(false);
									setEditingOverride(null);
									setSelectedChild(null);
									setFormData({ division_id: '', reason: '' });
									setSearchTerm('');
									setError(null);
								}}>
								Cancel
							</Button>
						</div>
					</form>
				)}

				{/* Existing Overrides */}
				{enrichedOverrides && enrichedOverrides.length > 0 ? (
					<div>
						<h4 className="font-medium mb-2">
							Existing Overrides ({enrichedOverrides.length})
						</h4>
						<div className="space-y-2">
							{enrichedOverrides.map((override) => (
								<div
									key={override.id}
									className="flex items-start justify-between p-3 border rounded-lg">
									<div className="space-y-1 flex-1">
										<h3 className="font-medium">{override.child_name}</h3>
										<div className="text-sm text-muted-foreground space-y-1">
											<div>Grade: {override.child_grade || 'Unknown'}</div>
											<div>Division: {override.division_name}</div>
											{override.reason && <div>Reason: {override.reason}</div>}
											<div>
												Created:{' '}
												{new Date(override.created_at).toLocaleDateString()}
											</div>
											{override.created_by && (
												<div>By: {override.created_by}</div>
											)}
										</div>
									</div>
									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => startEdit(override)}>
											<Edit2 className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleDelete(override)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="text-center py-8 text-muted-foreground">
						No manual overrides created yet
					</div>
				)}
			</CardContent>
		</Card>
	);
}
