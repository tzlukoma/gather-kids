/**
 * View model for the GatherSystem Bible Bee household screen (#371 part 2),
 * `/household/children/[childId]/bible-bee` behind
 * `gathersystem_bible_bee_household`.
 *
 * Pure functions over what the existing hooks already return, so the screen
 * reads and writes exactly what the legacy one does and every decision about
 * what to show is testable without rendering. Signed frames: `1s scriptures`
 * (32:80), `1t nothing marked` (34:2), `1u all memorized` (34:67),
 * `1v senior essay` (34:121) and desktop `37:2`.
 */

import { SERVICE_DAY_TIMEZONE } from '@/lib/utils/timezone';

/** One scripture assignment, reduced to what the screen needs. */
export type HouseholdScripture = {
	id: string;
	reference: string;
	/** Display number (`#10`). Falls back to list position. */
	number: number;
	/** Verse text by translation code, upper-cased keys. */
	texts: Record<string, string>;
	/** Text and translation the hook chose from the household's preference. */
	fallbackText: string;
	fallbackTranslation: string;
	completed: boolean;
	completedAt: string | null;
};

export type HouseholdEssay = {
	id: string;
	title: string;
	prompt: string;
	dueDate: string | null;
	submitted: boolean;
	submittedAt: string | null;
};

export type ScriptureTab = 'todo' | 'done' | 'all';

/**
 * Which of the signed frames the screen is in.
 *
 * `essay` wins whenever the child has an essay, matching the legacy screen's
 * `bbStats.essayAssigned` switch: divisions get scriptures or an essay.
 */
export type HouseholdBibleBeeState =
	| 'essay'
	| 'empty'
	| 'nothing-marked'
	| 'in-progress'
	| 'all-memorized';

type Loose = Record<string, unknown>;

function asRecord(value: unknown): Loose {
	return value && typeof value === 'object' ? (value as Loose) : {};
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function textsOf(scripture: Loose): Record<string, string> {
	const raw = scripture.texts;
	let map: unknown = raw;
	if (typeof raw === 'string') {
		try {
			map = JSON.parse(raw);
		} catch {
			map = null;
		}
	}
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(asRecord(map))) {
		if (typeof value === 'string' && value.trim()) {
			out[key.trim().toUpperCase()] = value;
		}
	}
	return out;
}

/**
 * Normalise the assignments `useStudentAssignmentsQuery` returns.
 *
 * Numbering follows the legacy `ScriptureCard`: `scripture_number`, then
 * `scripture_order`, then position. Sorted by that number so the list reads
 * in competition order whatever order the query returned.
 */
export function normalizeScriptures(raw: unknown[]): HouseholdScripture[] {
	return (raw ?? [])
		.map((item, index) => {
			const a = asRecord(item);
			const s = asRecord(a.scripture);
			const declared = Number(s.scripture_number ?? s.scripture_order);
			return {
				id: asString(a.id),
				reference: asString(s.reference).trim().replace(/\s+/g, ' ') ||
					asString(a.scriptureId),
				number: Number.isFinite(declared) && declared > 0 ? declared : index + 1,
				texts: textsOf(s),
				fallbackText: asString(a.verseText) || asString(s.text),
				fallbackTranslation: (
					asString(a.displayTranslation) ||
					asString(s.translation) ||
					'KJV'
				).toUpperCase(),
				completed: a.status === 'completed',
				completedAt: asString(a.completedAt) || null,
			};
		})
		.filter((s) => s.id)
		.sort((x, y) => x.number - y.number);
}

export function normalizeEssays(raw: unknown[]): HouseholdEssay[] {
	return (raw ?? [])
		.map((item) => {
			const e = asRecord(item);
			const p = asRecord(e.essayPrompt);
			return {
				id: asString(e.id),
				title: asString(p.title).trim() || 'Essay assignment',
				prompt: (asString(p.prompt) || asString(p.instructions)).trim(),
				dueDate: asString(p.due_date) || null,
				submitted: e.status === 'submitted',
				submittedAt: asString(e.submitted_at) || null,
			};
		})
		.filter((e) => e.id);
}

/**
 * Translations offered by the chips: every translation any assigned verse
 * carries text for, common ones first. A verse missing the chosen translation
 * falls back to the text the hook picked (see `verseFor`), so offering a
 * translation only some verses have never blanks a card.
 */
const TRANSLATION_ORDER = ['KJV', 'NKJV', 'NIV', 'ESV', 'NLT', 'CSB', 'NASB'];

export function translationOptions(scriptures: HouseholdScripture[]): string[] {
	const found = new Set<string>();
	for (const s of scriptures) {
		for (const key of Object.keys(s.texts)) found.add(key);
	}
	if (found.size === 0) {
		for (const s of scriptures) if (s.fallbackText) found.add(s.fallbackTranslation);
	}
	return [...found].sort((a, b) => {
		const ia = TRANSLATION_ORDER.indexOf(a);
		const ib = TRANSLATION_ORDER.indexOf(b);
		if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
		return a.localeCompare(b);
	});
}

/**
 * The translation shown first: the one the hook already chose from the
 * household's preference, so a family sees what they see on the legacy
 * screen. Falls back to the first chip.
 */
export function defaultTranslation(
	scriptures: HouseholdScripture[],
	options: string[]
): string | null {
	const preferred = scriptures.find((s) => s.fallbackText)?.fallbackTranslation;
	if (preferred && options.includes(preferred)) return preferred;
	return options[0] ?? null;
}

/** The verse text to show, and the translation it actually is. */
export function verseFor(
	scripture: HouseholdScripture,
	translation: string | null
): { text: string; translation: string } {
	if (translation && scripture.texts[translation]) {
		return { text: scripture.texts[translation], translation };
	}
	return { text: scripture.fallbackText, translation: scripture.fallbackTranslation };
}

export function scriptureCounts(scriptures: HouseholdScripture[]) {
	const done = scriptures.filter((s) => s.completed).length;
	return { todo: scriptures.length - done, done, all: scriptures.length };
}

/**
 * The cards in a tab.
 *
 * `keep` holds ids marked or unmarked since the tab was opened. They stay
 * where they are until the tab changes, so a tap does not whisk a card out
 * from under the finger and a mistaken tap can be undone in place — the
 * signed `1s` and `37:2` frames show a just-checked card still in
 * `To memorize`.
 */
export function scripturesForTab(
	scriptures: HouseholdScripture[],
	tab: ScriptureTab,
	keep: ReadonlySet<string> = new Set()
): HouseholdScripture[] {
	if (tab === 'all') return scriptures;
	const wantDone = tab === 'done';
	return scriptures.filter((s) => s.completed === wantDone || keep.has(s.id));
}

export function householdBibleBeeState(
	scriptures: HouseholdScripture[],
	essays: HouseholdEssay[]
): HouseholdBibleBeeState {
	if (essays.length > 0) return 'essay';
	if (scriptures.length === 0) return 'empty';
	const { done, all } = scriptureCounts(scriptures);
	if (done === 0) return 'nothing-marked';
	if (done === all) return 'all-memorized';
	return 'in-progress';
}

/** `Eli’s scriptures`, `Maya’s assignments`. */
export function possessive(firstName: string | null | undefined): string {
	const name = (firstName ?? '').trim();
	return name ? `${name}’s` : 'Your child’s';
}

/**
 * `of 20 memorized · 11 to go`, beside the large figure.
 *
 * The figures are the stats hook's — completed weighted by `counts_for`, out
 * of the division's required count — so this screen and the home card never
 * disagree about the same child. `· N to go` appears only part-way through,
 * as in the frames: `1t` reads `0 of 20 memorized` and `1u` `20 of 20`.
 */
export function buildHeadlineRest(completed: number, required: number): string {
	const total = Math.max(0, Math.floor(required));
	const done = Math.min(Math.max(0, Math.floor(completed)), total || Infinity);
	const rest = `of ${total} memorized`;
	const toGo = total - done;
	return done > 0 && toGo > 0 ? `${rest} · ${toGo} to go` : rest;
}

const SHORT_DAY_IN_CHURCH_ZONE = new Intl.DateTimeFormat('en-US', {
	timeZone: SERVICE_DAY_TIMEZONE,
	month: 'short',
	day: 'numeric',
});
const SHORT_CALENDAR_DAY = new Intl.DateTimeFormat('en-US', {
	timeZone: 'UTC',
	month: 'short',
	day: 'numeric',
});

/**
 * `Oct 12`. A timestamp is shown as the church's calendar day; a bare
 * `YYYY-MM-DD` (an essay's `due_date`) is already a calendar day, and reading
 * it in any zone west of UTC would move it back one.
 */
export function shortDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
	const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
	if (Number.isNaN(date.getTime())) return null;
	return (dateOnly ? SHORT_CALENDAR_DAY : SHORT_DAY_IN_CHURCH_ZONE).format(date);
}

/**
 * `Oct 26` for an essay's due date.
 *
 * Not `shortDate`: the admin form (`bible-bee-manage.tsx`) stores the church's
 * wall-clock due date and time in the UTC fields of the timestamp — `Oct 26,
 * 11:59 PM` is saved as `2026-10-26T23:59:00Z` — and the legacy card reads it
 * back the same way. Converting it to church time would show a due date of
 * Oct 26 as Oct 25 whenever the time is before 4 or 5 AM UTC, which is exactly
 * what a date entered without a time becomes.
 */
export function dueDateLabel(value: string | null | undefined): string | null {
	if (!value) return null;
	const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
	if (Number.isNaN(date.getTime())) return null;
	return SHORT_CALENDAR_DAY.format(date);
}

/**
 * The line under `Every scripture memorized`. Names the division and the day
 * of the last verse when both are known, and says less rather than invent
 * either.
 */
export function buildCompletionLine(
	firstName: string | null | undefined,
	divisionName: string | null | undefined,
	scriptures: HouseholdScripture[]
): string {
	const who = (firstName ?? '').trim() || 'Your child';
	const latest = scriptures
		.map((s) => s.completedAt)
		.filter((d): d is string => !!d && !Number.isNaN(new Date(d).getTime()))
		.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
	const day = shortDate(latest);
	const division = (divisionName ?? '').trim();
	const verses = division ? `the ${division} division verses` : 'the verses';
	return day
		? `${who} marked the last of ${verses} on ${day}.`
		: `${who} has memorized every one of ${verses}.`;
}

/** Memorized rows, newest first when sorted by date, else by number. */
export function memorizedRows(
	scriptures: HouseholdScripture[],
	sortByDate: boolean
): HouseholdScripture[] {
	const done = scriptures.filter((s) => s.completed);
	if (!sortByDate) return [...done].sort((a, b) => a.number - b.number);
	const time = (s: HouseholdScripture) => {
		const t = s.completedAt ? new Date(s.completedAt).getTime() : NaN;
		return Number.isNaN(t) ? -Infinity : t;
	};
	return [...done].sort((a, b) => time(b) - time(a) || b.number - a.number);
}

/** The intro in `1t`, before anything is marked. */
export function buildNothingMarkedIntro(
	firstName: string | null | undefined,
	total: number
): string {
	const who = (firstName ?? '').trim() || 'your child';
	const noun = total === 1 ? 'scripture is' : 'scriptures are';
	return `All ${total} ${noun} here. Work through them in any order and tap the check when ${who} can say one from memory.`;
}

/** The sentence under `Maya’s assignments`. */
export function buildEssayIntro(divisionName: string | null | undefined): string {
	const division = (divisionName ?? '').trim();
	return division
		? `The ${division} division is assigned an essay, so there are no scriptures to memorize.`
		: 'This division is assigned an essay, so there are no scriptures to memorize.';
}

/**
 * Where `Upload Essay` goes. The live flow opens this form in a new tab; the
 * app itself never marks an essay submitted. Shared with the legacy
 * `EssaySubmissions` so the two paths cannot drift.
 */
export const ESSAY_UPLOAD_URL =
	'https://docs.google.com/forms/d/e/1FAIpQLSe4z-u1Tiyz403ExsRH-tV4tAO0PwI7Min4QPwBLtSrf1lQOA/viewform?usp=header';
