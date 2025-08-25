'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import {
	upsertScripture,
	validateCsvRows,
	commitCsvRowsToYear,
} from '@/lib/bibleBee';
import {
	useScripturesForYear,
	createGradeRule as hookCreateGradeRule,
} from '@/lib/hooks/useBibleBee';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function YearManagePage() {
	const params = useParams();
	const yearId = params.id as string;
	const { scriptures, refresh: refreshScriptures } =
		useScripturesForYear(yearId);
	const [localScriptures, setLocalScriptures] = React.useState<any[]>([]);
	const [rules, setRules] = React.useState<any[]>([]);
	const [filePreview, setFilePreview] = React.useState<any[] | null>(null);
	const [fileErrors, setFileErrors] = React.useState<any[]>([]);

	React.useEffect(() => {
		let mounted = true;
		async function load() {
			const r = await db.gradeRules
				.where({ competitionYearId: yearId })
				.toArray();
			if (mounted) {
				setLocalScriptures(scriptures);
				setRules(r);
			}
		}
		load();
		return () => {
			mounted = false;
		};
	}, [yearId]);

	async function handleAddScripture(ref: string, text: string) {
		const s = await upsertScripture({
			competitionYearId: yearId,
			reference: ref,
			text,
			sortOrder: localScriptures.length + 1,
		});
		setLocalScriptures((prev) => [...prev, s]);
	}

	function handleFileSelected(ev: React.ChangeEvent<HTMLInputElement>) {
		const f = ev.target.files?.[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = () => {
			const txt = String(reader.result || '');
			const rows = txt
				.split(/\r?\n/)
				.map((line) => {
					const [reference, text, translation, sortOrder] = line.split(',');
					return {
						reference: reference?.trim(),
						text: text?.trim(),
						translation: translation?.trim(),
						sortOrder: sortOrder ? Number(sortOrder) : undefined,
					};
				})
				.filter((r) => r.reference || r.text);
			const res = validateCsvRows(rows);
			setFilePreview(rows);
			setFileErrors(res.errors);
		};
		reader.readAsText(f);
	}

	async function handleCommitPreview() {
		if (!filePreview) return;
		await commitCsvRowsToYear(filePreview, yearId);
		const s = await db.scriptures
			.where('competitionYearId')
			.equals(yearId)
			.sortBy('sortOrder');
		setLocalScriptures(s);
		setFilePreview(null);
		setFileErrors([]);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Manage Bible Bee Year</h2>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader>
						<CardTitle>Scriptures</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{localScriptures.map((s) => (
								<li key={s.id} className="flex justify-between items-center">
									<div>
										<div className="font-medium">{s.reference}</div>
										<div className="text-sm text-muted-foreground">
											{s.text}
										</div>
									</div>
								</li>
							))}
						</ul>
						<div className="mt-4">
							<ScriptureForm onAdd={handleAddScripture} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Grade Rules</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2">
							{rules.map((r) => (
								<li key={r.id} className="flex justify-between items-center">
									<div>
										{r.minGrade}-{r.maxGrade}:{' '}
										{r.type === 'scripture'
											? `scripture (${r.targetCount})`
											: 'essay'}
									</div>
								</li>
							))}
						</ul>
						<GradeRuleForm
							competitionYearId={yearId}
							onCreate={async (payload: any) => {
								const nr = await hookCreateGradeRule(payload);
								setRules((prev) => [...prev, nr]);
							}}
						/>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>CSV Import</CardTitle>
				</CardHeader>
				<CardContent>
					<input
						type="file"
						accept=".csv,text/csv"
						onChange={handleFileSelected}
					/>
					{fileErrors.length > 0 && (
						<div className="text-red-600 mt-2">
							{fileErrors.map((e) => (
								<div key={`${e.row}-${e.message}`}>
									Row {e.row}: {e.message}
								</div>
							))}
						</div>
					)}
					{filePreview && (
						<div className="mt-2">
							<div className="text-sm text-muted-foreground">
								Preview ({filePreview.length} rows)
							</div>
							<div className="overflow-auto max-h-48 mt-2">
								<table className="w-full table-auto">
									<thead>
										<tr>
											<th>Reference</th>
											<th>Text</th>
											<th>Translation</th>
										</tr>
									</thead>
									<tbody>
										{filePreview.map((r, i) => (
											<tr key={i}>
												<td>{r.reference}</td>
												<td>{r.text}</td>
												<td>{r.translation}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="mt-2">
								<Button onClick={handleCommitPreview}>Commit to Year</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function ScriptureForm({
	onAdd,
}: {
	onAdd: (ref: string, text: string) => Promise<void>;
}) {
	const [ref, setRef] = React.useState('');
	const [text, setText] = React.useState('');
	return (
		<div className="space-y-2">
			<Input
				placeholder="Reference (e.g. John 3:16)"
				value={ref}
				onChange={(e) => setRef(e.target.value)}
			/>
			<Input
				placeholder="Text"
				value={text}
				onChange={(e) => setText(e.target.value)}
			/>
			<Button
				onClick={() => {
					onAdd(ref, text);
					setRef('');
					setText('');
				}}>
				Add Scripture
			</Button>
		</div>
	);
}

function GradeRuleForm({ competitionYearId, onCreate }: any) {
	const [minGrade, setMinGrade] = React.useState(1);
	const [maxGrade, setMaxGrade] = React.useState(6);
	const [type, setType] = React.useState<'scripture' | 'essay'>('scripture');
	const [targetCount, setTargetCount] = React.useState(20);
	const [promptText, setPromptText] = React.useState('');

	return (
		<div className="space-y-2 mt-2">
			<div className="flex gap-2">
				<Input
					type="number"
					value={minGrade}
					onChange={(e) => setMinGrade(Number(e.target.value))}
				/>
				<Input
					type="number"
					value={maxGrade}
					onChange={(e) => setMaxGrade(Number(e.target.value))}
				/>
			</div>
			<div className="flex gap-2">
				<select
					value={type}
					onChange={(e) => setType(e.target.value as any)}
					className="input">
					<option value="scripture">Scripture</option>
					<option value="essay">Essay</option>
				</select>
				{type === 'scripture' ? (
					<Input
						type="number"
						value={targetCount}
						onChange={(e) => setTargetCount(Number(e.target.value))}
					/>
				) : (
					<Input
						value={promptText}
						onChange={(e) => setPromptText(e.target.value)}
						placeholder="Prompt text"
					/>
				)}
			</div>
			<Button
				onClick={() =>
					onCreate({
						competitionYearId,
						minGrade,
						maxGrade,
						type,
						targetCount,
						promptText,
					})
				}>
				Create Rule
			</Button>
		</div>
	);
}
