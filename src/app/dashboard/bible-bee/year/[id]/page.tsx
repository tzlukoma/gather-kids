"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db';
import {
  upsertScripture,
  validateCsvRows,
  commitCsvRowsToYear,
  previewCsvJsonMatches,
} from '@/lib/bibleBee';
import {
  useScripturesForYear,
  useScripturesForYearQuery,
  createGradeRule as hookCreateGradeRule,
} from '@/lib/hooks/useBibleBee';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ScriptureCard from '@/components/gatherKids/scripture-card';
import ScriptureForm from '@/components/gatherKids/scripture-form';
import { CsvRow } from '@/lib/bibleBee';

"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import {
	upsertScripture,
	validateCsvRows,
	commitCsvRowsToYear,
	previewCsvJsonMatches,
	CsvRow,
} from '@/lib/bibleBee';
import { useScripturesForYear, useScripturesForYearQuery } from '@/lib/hooks/useBibleBee';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ScriptureCard from '@/components/gatherKids/scripture-card';

export default function YearManagePage() {
	const params = useParams();
	const yearId = String(params?.id ?? '');

	const [filePreview, setFilePreview] = React.useState<CsvRow[] | null>(null);
	const [fileErrors, setFileErrors] = React.useState<any[]>([]);
	const [jsonPreview, setJsonPreview] = React.useState<any[] | null>(null);
	const [jsonErrors, setJsonErrors] = React.useState<any[]>([]);
	const [matchPreview, setMatchPreview] = React.useState<any | null>(null);

	const { scriptures: localScriptures } = useScripturesForYear(yearId as string) as any;
	useScripturesForYearQuery(yearId as string);

	async function handleFileSelected(ev: React.ChangeEvent<HTMLInputElement>) {
		const f = ev.target.files?.[0];
		if (!f) return;
		try {
			const text = await f.text();
			const lines = text.split(/\r?\n/).filter(Boolean);
			const rows: CsvRow[] = lines.map((ln) => {
				const parts = ln.split(',');
				return {
					reference: parts[0]?.trim() || undefined,
					text: parts[1]?.trim() || undefined,
					translation: parts[2]?.trim() || undefined,
					scripture_order: parts[3] ? Number(parts[3]) : undefined,
					// Keep sortOrder for compatibility, but use scripture_order as the primary field
					sortOrder: parts[3] ? Number(parts[3]) : undefined,
				} as CsvRow;
			});
			const { valid, errors } = validateCsvRows(rows);
			if (!valid) {
				setFileErrors(errors);
				setFilePreview(rows);
				setMatchPreview(previewCsvJsonMatches(rows, jsonPreview || []));
				return;
			}
			setFileErrors([]);
			setFilePreview(rows);
			setMatchPreview(previewCsvJsonMatches(rows, jsonPreview || []));
		} catch (err: any) {
			setFileErrors([{ row: 0, message: err?.message ?? String(err) }]);
			setFilePreview(null);
			setMatchPreview(null);
		}
	}

	async function handleJsonSelected(ev: React.ChangeEvent<HTMLInputElement>) {
		const f = ev.target.files?.[0];
		if (!f) return;
		try {
			const text = await f.text();
			let parsed: any = JSON.parse(text);
			if (!Array.isArray(parsed) && parsed?.scriptures && Array.isArray(parsed.scriptures)) {
				parsed = parsed.scriptures;
			}
			if (!Array.isArray(parsed)) throw new Error('JSON must be an array of scripture objects');
			setJsonErrors([]);
			setJsonPreview(parsed);
			setMatchPreview(previewCsvJsonMatches(filePreview || [], parsed));
		} catch (err: any) {
			setJsonPreview(null);
			setJsonErrors([{ row: 0, message: err?.message ?? String(err) }]);
			setMatchPreview(null);
		}
	}

	React.useEffect(() => {
		try {
			const preview = previewCsvJsonMatches(filePreview || [], jsonPreview || []);
			setMatchPreview(preview);
		} catch (e) {
			setMatchPreview(null);
		}
	}, [filePreview, jsonPreview]);

	async function handleCommitPreview() {
		if (!filePreview) return;
		await commitCsvRowsToYear(filePreview, yearId);
		setFilePreview(null);
		setJsonPreview(null);
		setMatchPreview(null);
	}

	async function handleAddScripture(ref: string, text: string) {
		// Normalize reference before upserting
		const normalizedRef = ref.trim().replace(/\s+/g, ' ');
		
		// Find the highest sortOrder value to ensure new scripture is appended at the end
		const existingScriptures = localScriptures || [];
		const highestOrderValue = existingScriptures.reduce((max: number, s: any) => {
			const order = Number(s.sortOrder ?? s.order ?? 0);
			return Math.max(max, isNaN(order) ? 0 : order);
		}, 0);
		
		// Use reference for matching and explicitly set sortOrder for new items
		await upsertScripture({
			competitionYearId: yearId,
			reference: normalizedRef,
			text,
			sortOrder: highestOrderValue + 1
		});
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
						<div className="grid gap-2">
							{(localScriptures || []).map((s: any, idx: number) => (
								<ScriptureCard
									key={s.id}
									assignment={{ id: s.id, scriptureId: s.id, scripture: s, verseText: s.text, competitionYearId: s.competitionYearId }}
									index={idx}
									readOnly
								/>
							))}
						</div>
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
						<div className="text-sm text-muted-foreground">Manage grade rules from the main management panel.</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Scripture Import</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row gap-2">
							<div className="flex-1">
								<label className="block text-sm font-medium mb-1">CSV File</label>
								<input type="file" accept=".csv,text/csv" onChange={handleFileSelected} />
							</div>
							<div className="flex-1">
								<label className="block text-sm font-medium mb-1">JSON File</label>
								<input type="file" accept="application/json,application/*+json" onChange={handleJsonSelected} />
							</div>
						</div>
						
						<div className="text-xs text-muted-foreground p-2 border rounded-md bg-gray-50">
							<h4 className="font-medium mb-1">JSON Format:</h4>
							<code className="whitespace-pre-wrap text-xs">
{`{
  "competition_year": "2025-2026",
  "translations": ["NIV", "KJV", "NVI"],
  "scriptures": [
    {
      "reference": "Exodus 20:2-3",
      "texts": {
        "NIV": "<sup>2</sup>I am the LORD your God...",
        "KJV": "<sup>2</sup>I am the LORD thy God...",
        "NVI": "<sup>2</sup>Yo soy el SEÑOR tu Dios..."
      }
    }
  ]
}`}
							</code>
							<div className="mt-1">Note: <strong>No order field is needed</strong> in JSON. References are matched by text, and CSV sort order is preserved during import.</div>
						</div>
					</div>

					{(fileErrors.length > 0 || jsonErrors.length > 0) && (
						<div className="text-red-600 mt-2">
							{fileErrors.map((e: any) => (
								<div key={`csv-${e.row}-${e.message}`}>Row {e.row}: {e.message}</div>
							))}
							{jsonErrors.map((e: any) => (
								<div key={`json-${e.row}-${e.message}`}>Error: {e.message}</div>
							))}
						</div>
					)}

					{filePreview && (
						<div className="mt-2">
							<div className="text-sm text-muted-foreground">Preview ({filePreview.length} rows)</div>
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
												<td>
													{r.reference ? <span>{r.reference}</span> : <span className="text-red-600 font-semibold">Missing reference</span>}
													{!r.reference && r.text && (
														<div className="text-xs text-muted-foreground mt-1">{String(r.text).slice(0, 80)}{String(r.text).length > 80 ? '…' : ''}</div>
													)}
												</td>
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

					{matchPreview && (
						<div className="mt-4 border-t pt-3">
							{filePreview && !(jsonPreview && jsonPreview.length > 0) && (
								<div className="text-sm text-yellow-700 mb-2">No JSON uploaded — all CSV rows will be shown as unmatched until you upload a JSON seed.</div>
							)}
							{jsonPreview && !(filePreview && filePreview.length > 0) && (
								<div className="text-sm text-yellow-700 mb-2">No CSV uploaded — all JSON entries will be shown as unmatched until you upload a CSV.</div>
							)}

							<div className="text-sm font-semibold">Match Summary</div>
							<div className="text-xs text-muted-foreground mt-1">Matches: {matchPreview.stats.matches}, CSV-only: {matchPreview.stats.csvOnly}, JSON-only: {matchPreview.stats.jsonOnly}</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
								<div>
									<div className="font-semibold text-sm">CSV-only</div>
									{matchPreview.csvOnly.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
										<ul className="list-disc list-inside text-sm max-h-32 overflow-auto">
											{matchPreview.csvOnly.map((c: any) => <li key={c.reference + '-' + c.index}>{c.reference} {c.row.translation ? `(${c.row.translation})` : ''}</li>)}
										</ul>
									)}
								</div>
								<div>
									<div className="font-semibold text-sm">JSON-only</div>
									{matchPreview.jsonOnly.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
										<ul className="list-disc list-inside text-sm max-h-32 overflow-auto">
											{matchPreview.jsonOnly.map((j: any) => (
												<li key={`${j.reference ?? 'missing'}-${j.index}`}>
													{j.reference === null ? <span className="text-red-600 font-semibold">Missing reference</span> : <>{j.reference} {j.item?.translation ? `(${j.item.translation})` : ''}</>}
													{j.reference === null && j.item && <div className="text-xs text-muted-foreground mt-1">Item #{j.index}{j.item?.id ? ` • id: ${j.item.id}` : ''}</div>}
												</li>
											))}
										</ul>
									)}
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function ScriptureForm({ onAdd }: { onAdd: (ref: string, text: string) => Promise<void> }) {
	const [ref, setRef] = React.useState('');
	const [text, setText] = React.useState('');
	
	const handleAddScripture = () => {
		// Normalize the reference before adding
		const normalizedRef = ref.trim().replace(/\s+/g, ' ');
		onAdd(normalizedRef, text);
		setRef('');
		setText('');
	};
	
	return (
		<div className="space-y-2">
			<Input placeholder="Reference (e.g. John 3:16)" value={ref} onChange={(e) => setRef(e.target.value)} />
			<Input placeholder="Text" value={text} onChange={(e) => setText(e.target.value)} />
			<Button onClick={handleAddScripture}>Add Scripture</Button>
		</div>
	);
}
													))}
												</ul>
											)
										</div>
										<div>
											<div className="font-semibold text-sm">JSON-only</div>
											{matchPreview.jsonOnly.length === 0 ? (
												<div className="text-xs text-muted-foreground">
													None
												</div>
											) : (
												<ul className="list-disc list-inside text-sm max-h-32 overflow-auto">
													{matchPreview.jsonOnly.map((j: any) => (
														<li key={`${j.reference ?? 'missing'}-${j.index}`}>
															{j.reference === null ? (
																<span className="text-red-600 font-semibold">Missing reference</span>
															) : (
																<>
																	{j.reference}{' '}
																	{j.item?.translation ? `(${j.item.translation})` : ''}
																</>
															)
															{j.reference === null && j.item && (
																<div className="text-xs text-muted-foreground mt-1">Item #{j.index}{j.item?.id ? ` • id: ${j.item.id}` : ''}</div>
															)
														</li>
													))}
												</ul>
											)
										</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
	async function handleJsonSelected(ev: React.ChangeEvent<HTMLInputElement>) {
		const f = ev.target.files?.[0];
		if (!f) return;
		try {
			const text = await f.text();
			let parsed: any = JSON.parse(text);
			// If the JSON has a top-level key like 'scriptures' accept it
			if (
				!Array.isArray(parsed) &&
				parsed?.scriptures &&
				Array.isArray(parsed.scriptures)
			) {
				parsed = parsed.scriptures;
			}
			if (!Array.isArray(parsed))
				throw new Error('JSON must be an array of scripture objects');
			setJsonPreview(parsed);
			setJsonErrors([]);
			try {
				const preview = previewCsvJsonMatches(filePreview || [], parsed);
				setMatchPreview(preview);
			} catch (e) {
				setMatchPreview(null);
			}
		} catch (err: any) {
			setJsonPreview(null);
			setJsonErrors([{ row: 0, message: err?.message ?? String(err) }]);
			setMatchPreview(null);
		}
	}

	// recompute preview whenever either CSV or JSON uploads change
	React.useEffect(() => {
		try {
			const preview = previewCsvJsonMatches(
				filePreview || [],
				jsonPreview || []
			);
			setMatchPreview(preview);
		} catch (e) {
			setMatchPreview(null);
		}
	}, [filePreview, jsonPreview]);

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
						{availableVersions.length > 0 && (
							<div className="flex gap-2 mb-2">
								{availableVersions.map((v) => (
									<button
										key={v}
										onClick={() => setDisplayVersion(v)}
										aria-pressed={v === displayVersion}
										aria-label={`Show ${v}`}
										className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
											v === displayVersion
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'bg-background text-muted-foreground border'
										}`}>
										{v}
									</button>
								))}
							</div>
						)}
						<div className="grid gap-2">
							{localScriptures
								.filter((s: any) => {
									if (!displayVersion) return true;
									const v = String(displayVersion).toUpperCase();
									if (
										s.translation &&
										String(s.translation).toUpperCase() === v
									)
										return true;
									const keys = s.texts
										? Object.keys(s.texts).map((k: string) => k.toUpperCase())
										: [];
									return keys.includes(v);
								})
								.map((s: any, idx: number) => (
									<ScriptureCard
										key={s.id}
										assignment={{
											id: s.id,
											scriptureId: s.id,
											scripture: s,
											verseText: s.text,
											competitionYearId: s.competitionYearId,
										}}
										index={idx}
										readOnly
										displayVersion={displayVersion}
									/>
								))}
						</div>
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
					<div className="flex flex-col sm:flex-row gap-2">
						<input
							type="file"
							accept=".csv,text/csv"
							onChange={handleFileSelected}
						/>
						<input
							type="file"
							accept="application/json,application/*+json"
							onChange={handleJsonSelected}
						/>
					</div>
					{(fileErrors.length > 0 || jsonErrors.length > 0) && (
						<div className="text-red-600 mt-2">
							{fileErrors.map((e) => (
								<div key={`csv-${e.row}-${e.message}`}>
									Row {e.row}: {e.message}
								</div>
							))}
							{jsonErrors.map((e) => (
								<div key={`json-${e.row}-${e.message}`}>Error: {e.message}</div>
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
												<td>
													{r.reference ? (
														<span>{r.reference}</span>
													) : (
														<span className="text-red-600 font-semibold">Missing reference</span>
													)}
													{!r.reference && r.text && (
														<div className="text-xs text-muted-foreground mt-1">{String(r.text).slice(0, 80)}{String(r.text).length > 80 ? '…' : ''}</div>
													)}
												</td>
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

					{matchPreview && (
						<div className="mt-4 border-t pt-3">
							{filePreview && !(jsonPreview && jsonPreview.length > 0) && (
								<div className="text-sm text-yellow-700 mb-2">No JSON uploaded — all CSV rows will be shown as unmatched until you upload a JSON seed.</div>
							)}
							{jsonPreview && !(filePreview && filePreview.length > 0) && (
								<div className="text-sm text-yellow-700 mb-2">No CSV uploaded — all JSON entries will be shown as unmatched until you upload a CSV.</div>
							)}
							<div className="text-sm font-semibold">Match Summary</div>
							<div className="text-xs text-muted-foreground mt-1">
								Matches: {matchPreview.stats.matches}, CSV-only:{' '}
								{matchPreview.stats.csvOnly}, JSON-only:{' '}
								{matchPreview.stats.jsonOnly}
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
								<div>
									<div className="font-semibold text-sm">CSV-only</div>
									{matchPreview.csvOnly.length === 0 ? (
										<div className="text-xs text-muted-foreground">
											None
										</div>
									) : (
										<ul className="list-disc list-inside text-sm max-h-32 overflow-auto">
											{matchPreview.csvOnly.map((c: any) => (
												<li key={c.reference + '-' + c.index}>
													{c.reference}{' '}
													{c.row.translation
														? `(${c.row.translation})`
														: ''}
												</li>
											))}
										</ul>
									)}
								</div>
								<div>
									<div className="font-semibold text-sm">JSON-only</div>
									{matchPreview.jsonOnly.length === 0 ? (
										<div className="text-xs text-muted-foreground">
											None
										</div>
									) : (
										<ul className="list-disc list-inside text-sm max-h-32 overflow-auto">
											{matchPreview.jsonOnly.map((j: any) => (
												<li key={`${j.reference ?? 'missing'}-${j.index}`}>
													{j.reference === null ? (
														<span className="text-red-600 font-semibold">Missing reference</span>
													) : (
														<>
															{j.reference}{' '}
															{j.item?.translation ? `(${j.item.translation})` : ''}
														</>
													)}
													{j.reference === null && j.item && (
														<div className="text-xs text-muted-foreground mt-1">Item #{j.index}{j.item?.id ? ` • id: ${j.item.id}` : ''}</div>
													)}
												</li>
											))}
										</ul>
									)}
								</div>
							</div>
						</div>
					)}
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
