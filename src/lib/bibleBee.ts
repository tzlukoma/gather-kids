import type { Division, Scripture, StudentScripture } from './types';
import { gradeToCode } from './gradeUtils';
import { db as dbAdapter } from './database/factory';

export type ChildDivisionInfo = {
	division: {
		name: string;
		min_grade: number;
		max_grade: number;
		minimum_required?: number;
	} | null;
	target: number | null;
	gradeGroup: string;
};

export async function getChildDivisionInfo(
	childId: string,
	yearId: string,
): Promise<ChildDivisionInfo> {
	try {
		const child = await dbAdapter.getChild(childId);
		if (!child?.grade) {
			return { division: null, target: null, gradeGroup: 'N/A' };
		}

		const gradeNum = gradeToCode(child.grade);
		if (gradeNum === null) {
			return { division: null, target: null, gradeGroup: 'N/A' };
		}

		let divisions: Division[] = [];
		try {
			divisions = await dbAdapter.listDivisions(yearId);
		} catch (error) {
			console.warn('getChildDivisionInfo: Error listing divisions:', error);
			divisions = [];
		}

		const matchingDivision = divisions.find((d) => {
			const minGrade = Number(d.min_grade);
			const maxGrade = Number(d.max_grade);
			return !isNaN(minGrade) && !isNaN(maxGrade) && gradeNum >= minGrade && gradeNum <= maxGrade;
		});

		if (!matchingDivision) {
			return { division: null, target: null, gradeGroup: 'N/A' };
		}

		const gradeLabel = (grade: number) => {
			if (grade === 0) return 'Kindergarten';
			if (grade === 1) return '1st Grade';
			if (grade === 2) return '2nd Grade';
			if (grade === 3) return '3rd Grade';
			if (grade >= 4 && grade <= 12) {
				const lastDigit = grade % 10;
				const lastTwoDigits = grade % 100;
				if (lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${grade}th Grade`;
				if (lastDigit === 1) return `${grade}st Grade`;
				if (lastDigit === 2) return `${grade}nd Grade`;
				if (lastDigit === 3) return `${grade}rd Grade`;
				return `${grade}th Grade`;
			}
			return `Grade ${grade}`;
		};
		const gradeRange =
			matchingDivision.min_grade === matchingDivision.max_grade
				? gradeLabel(matchingDivision.min_grade)
				: `${gradeLabel(matchingDivision.min_grade)} to ${gradeLabel(matchingDivision.max_grade)}`;

		return {
			division: {
				name: matchingDivision.name,
				min_grade: matchingDivision.min_grade,
				max_grade: matchingDivision.max_grade,
				minimum_required: matchingDivision.minimum_required,
			},
			target: matchingDivision.minimum_required || null,
			gradeGroup: `${matchingDivision.name} - ${gradeRange}`,
		};
	} catch (error) {
		console.warn('Error getting child division info:', error);
		return { division: null, target: null, gradeGroup: 'N/A' };
	}
}

export async function enrollChildInBibleBee(childId: string, competitionYearId: string) {
	const child = await dbAdapter.getChild(childId);
	if (!child) {
		return { assigned: 0, error: 'Child not found' };
	}

	const scriptures = (await dbAdapter.listScriptures({ yearId: competitionYearId })).sort(
		(a: Scripture, b: Scripture) => {
			const aRec = a as unknown as Record<string, unknown>;
			const bRec = b as unknown as Record<string, unknown>;
			const aOrder = Number(aRec['scripture_order'] ?? aRec['sortOrder'] ?? 0);
			const bOrder = Number(bRec['scripture_order'] ?? bRec['sortOrder'] ?? 0);
			return aOrder - bOrder;
		},
	);

	if (scriptures.length === 0) {
		return { assigned: 0, error: 'No scriptures found for this year' };
	}

	const existing = await dbAdapter.listStudentScriptures(childId, competitionYearId);
	const existingKeys = new Set(
		existing.map(
			(s) =>
				(s as unknown as { scripture_id?: string; scriptureId?: string }).scripture_id ||
				(s as unknown as { scriptureId?: string }).scriptureId,
		),
	);

	const toInsert: Omit<StudentScripture, 'created_at' | 'updated_at'>[] = scriptures
		.filter((s) => !existingKeys.has(s.id))
		.map((s) => ({
			id: crypto.randomUUID(),
			child_id: childId,
			bible_bee_cycle_id: competitionYearId,
			scripture_id: s.id,
			is_completed: false,
		}));

	for (const record of toInsert) {
		await dbAdapter.createStudentScripture(record);
	}

	return { assigned: toInsert.length };
}

export async function toggleScriptureCompletion(studentScriptureId: string, complete: boolean) {
	const now = new Date().toISOString();
	await dbAdapter.updateStudentScripture(studentScriptureId, {
		is_completed: complete,
		completed_at: complete ? now : undefined,
	});
}

export async function submitEssay(childId: string, bibleBeeCycleId: string) {
	const now = new Date().toISOString();
	const studentEssays = await dbAdapter.listStudentEssays(childId, bibleBeeCycleId);
	if (studentEssays.length === 0) {
		console.warn(`No essay found for child ${childId}, cycle ${bibleBeeCycleId}`);
		return null;
	}
	const essay = studentEssays[0];
	await dbAdapter.updateStudentEssay(essay.id, {
		status: 'submitted',
		submitted_at: now,
	});
	return { submitted: true };
}

export type CsvRow = {
	reference?: string;
	text?: string;
	translation?: string;
	scripture_order?: number;
	sortOrder?: number;
};

export function validateCsvRows(rows: CsvRow[]) {
	const errors: { row: number; message: string }[] = [];
	const refs = new Set<string>();
	rows.forEach((r, i) => {
		if (!r.reference || !r.text) {
			errors.push({ row: i + 1, message: 'Missing reference or text' });
		}
		if (r.reference && refs.has(r.reference)) {
			errors.push({ row: i + 1, message: 'Duplicate reference in file' });
		}
		if (r.reference) refs.add(r.reference);
	});
	return { valid: errors.length === 0, errors };
}

export function previewCsvJsonMatches(rows: CsvRow[], jsonItems: Array<Record<string, unknown>>) {
	const normalizeReference = (s?: string | null) =>
		(s ?? '')
			.toString()
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/[^\w\d\s:\-]/g, '')
			.toLowerCase();

	const csvMap = new Map<string, { row: CsvRow; index: number }>();
	rows.forEach((r, i) => {
		const ref = normalizeReference(r.reference);
		if (ref) csvMap.set(ref, { row: r, index: i });
	});

	const jsonMap = new Map<string, { item: Record<string, unknown>; index: number }>();
	(jsonItems || []).forEach((j, i) => {
		if (!j) return;
		let safeItem: Record<string, unknown> = j;
		if (Object.prototype.hasOwnProperty.call(j, 'order')) {
			safeItem = { ...j };
			delete (safeItem as { order?: unknown }).order;
		}
		const rawRef = (safeItem['reference'] as string | undefined) ?? '';
		const ref = normalizeReference(rawRef);
		if (ref) jsonMap.set(ref, { item: safeItem, index: i });
	});

	const matches: Array<{
		reference: string;
		csv: { row: CsvRow; index: number } | null;
		json: { item: Record<string, unknown>; index: number } | null;
	}> = [];
	const csvOnly: Array<{ reference: string; row: CsvRow; index: number }> = [];
	const jsonOnly: Array<{ reference: string | null; item: Record<string, unknown>; index: number }> =
		[];

	const seen = new Set<string>();
	for (const key of csvMap.keys()) seen.add(key);
	for (const key of jsonMap.keys()) seen.add(key);

	for (const key of Array.from(seen)) {
		const c = csvMap.get(key) ?? null;
		const j = jsonMap.get(key) ?? null;
		if (c && j) {
			matches.push({ reference: key, csv: c, json: j });
		} else if (c && !j) {
			csvOnly.push({ reference: key, row: c.row, index: c.index });
		} else if (j && !c) {
			jsonOnly.push({ reference: key, item: j.item, index: j.index });
		}
	}

	(jsonItems || []).forEach((j, i) => {
		const rawRef = (j && (j['reference'] as string | undefined)) ?? '';
		const ref = normalizeReference(rawRef);
		if (!ref) {
			jsonOnly.push({ reference: null, item: j as Record<string, unknown>, index: i });
		}
	});

	const stats = {
		csvCount: rows.length,
		jsonCount: (jsonItems || []).length,
		matches: matches.length,
		csvOnly: csvOnly.length,
		jsonOnly: jsonOnly.length,
	};

	return { matches, csvOnly, jsonOnly, stats };
}

export interface JsonTextUpload {
	competition_year: string;
	translations: string[];
	scriptures: Array<{
		reference: string;
		texts: { [key: string]: string };
	}>;
}

export function validateJsonTextUpload(data: JsonTextUpload): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!data.competition_year) {
		errors.push('competition_year is required');
	}

	if (!Array.isArray(data.translations) || data.translations.length === 0) {
		errors.push('translations array is required and must not be empty');
	}

	if (!Array.isArray(data.scriptures)) {
		errors.push('scriptures array is required');
	} else {
		data.scriptures.forEach((scripture, index) => {
			if (!scripture.reference) {
				errors.push(`Scripture ${index + 1}: reference is required`);
			}
			if (!scripture.texts || typeof scripture.texts !== 'object') {
				errors.push(`Scripture ${index + 1}: texts object is required`);
			}
		});
	}

	return { isValid: errors.length === 0, errors };
}
