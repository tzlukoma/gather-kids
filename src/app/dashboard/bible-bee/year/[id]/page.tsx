'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { dbAdapter } from '@/lib/dal';
import { useScripturesForYear, useScripturesForYearQuery } from '@/lib/hooks/useBibleBee';
import {
	upsertScripture,
	validateCsvRows,
	commitCsvRowsToYear,
} from '@/lib/dal';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ScriptureCard from '@/components/gatherKids/scripture-card';

export default function YearManagePage() {
	const params = useParams();
	const yearId = params.id as string;
	const { scriptures, refresh: refreshScriptures } =
		useScripturesForYear(yearId);
	const { data: qScriptures, upsertScriptureMutation } =
		useScripturesForYearQuery(yearId);
	const [localScriptures, setLocalScriptures] = React.useState<any[]>([]);
	const [displayVersion, setDisplayVersion] = React.useState<
		string | undefined
	>(undefined);
	const [availableVersions, setAvailableVersions] = React.useState<string[]>(
		[]
	);
	const [rules, setRules] = React.useState<any[]>([]);
	const [filePreview, setFilePreview] = React.useState<any[] | null>(null);
	const [fileErrors, setFileErrors] = React.useState<any[]>([]);

	React.useEffect(() => {
		let mounted = true;
		async function load() {
			const r = await dbAdapter.listGradeRules(yearId);
			if (mounted) {
				setLocalScriptures(scriptures);
				// collect versions from scriptures
				const versions = new Set<string>();
				for (const item of scriptures || []) {
					if (item?.texts)
						Object.keys(item.texts).forEach((k) =>
							versions.add(k.toUpperCase())
						);
					if (item?.translation)
						versions.add(String(item.translation).toUpperCase());
				}
				const vlist = Array.from(versions);
				setAvailableVersions(vlist);
				if (!displayVersion && vlist.length) setDisplayVersion(vlist[0]);
				setRules(r);
			}
		}
		load();
		return () => {
			mounted = false;
		};
	}, [yearId]);

	async function handleAddScripture(ref: string, text: string) {
		const payload = {
			competitionYearId: yearId,
			reference: ref,
			text,
			sortOrder: localScriptures.length + 1,
		} as any;
		// optimistic mutation
		await upsertScriptureMutation.mutateAsync(payload);
		// local list will be refreshed via the query invalidation; keep UI responsive
		setLocalScriptures((prev) => [...prev, payload]);
	}

	async function handleFileSelected(ev: React.ChangeEvent<HTMLInputElement>) {
		const f = ev.target.files?.[0];
		if (!f) return;
		try {
			const { parse } = await import('papaparse');
			parse(f, {
				header: true,
				skipEmptyLines: true,
				transformHeader: (h: string) => h?.trim?.() ?? h,
				complete: (results: any) => {
					const rows = (results.data || [])
						.map((row: any) => ({
							reference: (row.reference ?? row.Reference ?? '')
								?.toString?.()
								?.trim?.(),
							text: (row.text ?? row.Text ?? '')?.toString?.()?.trim?.(),
							translation: (row.translation ?? row.Translation ?? '')
								?.toString?.()
								?.trim?.(),
							sortOrder: row.sortOrder ? Number(row.sortOrder) : undefined,
						}))
						.filter((r: any) => r.reference || r.text);
					const res = validateCsvRows(rows);
					setFilePreview(rows);
					setFileErrors(res.errors);
				},
				error: (err: any) => {
					setFileErrors([{ row: 0, message: err?.message ?? String(err) }]);
					setFilePreview(null);
				},
			});
		} catch (err: any) {
			setFileErrors([{ row: 0, message: err?.message ?? String(err) }]);
			setFilePreview(null);
		}
	}

	async function handleCommitPreview() {
		if (!filePreview) return;
		await commitCsvRowsToYear(filePreview, yearId);
		const s = await dbAdapter.listScriptures({ yearId });
		setLocalScriptures(
			s.sort(
				(a: any, b: any) =>
					Number(a.order ?? a.sortOrder ?? 0) -
					Number(b.order ?? b.sortOrder ?? 0)
			)
		);
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
