import type { FieldErrors, FieldPath } from 'react-hook-form';
import type { RegistrationFormInput } from './registration-schema';

/**
 * Which wizard step owns which part of the registration schema.
 *
 * The wizard used to gate "Continue" on hand-written truthiness checks that
 * looked at a handful of fields — `guardians[0].mobile_phone` and nothing
 * else, for instance. Two failure modes came out of that: a second guardian
 * could carry an empty required field all the way to the end, and a field the
 * check read as present (`'5'`) could still fail the schema (`min(10)`).
 * Either way the user reached step 5 and met a Submit button that would not
 * explain itself, because the form only reports problems on a submit it
 * refuses to run.
 *
 * So this module does not restate any rule. It only says which paths belong to
 * which step; React Hook Form's `trigger()` runs the canonical Zod schema over
 * them, and the mapping here turns whatever comes back into "go to step N".
 */

export const WIZARD_STEP_COUNT = 5;

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type FormPath = FieldPath<RegistrationFormInput>;

export interface StepProblem {
	/** Dotted schema path, e.g. `guardians.1.mobile_phone`. */
	path: string;
	message: string;
	step: WizardStep;
}

/**
 * Why there is no per-step `trigger(paths)` call.
 *
 * The obvious implementation is `form.trigger(['household'])` on the way out of
 * step 1. It does not work. With a resolver, React Hook Form runs the whole
 * schema and then copies errors back for the names it was given — and for a
 * plain object path it copies nothing. Measured against this schema:
 *
 *   trigger(['household','guardians','emergencyContact','consents'])
 *     -> errors: { guardians: [...] }            // the other three are dropped
 *   trigger()
 *     -> errors: { household, guardians, emergencyContact, children, consents }
 *
 * Only the array path survived. A gate built on the narrow call would have
 * passed step 1 and step 5 no matter what was in them, which is the bug this
 * ticket exists to fix, reintroduced one layer down.
 *
 * So the wizard runs one whole-form `trigger()` and decides using
 * `stepForPath` below: a step blocks when it owns a problem, and ignores
 * problems belonging to steps the user has not reached. One validation pass,
 * one set of rules, and no dependence on which paths RHF chooses to copy.
 */

/**
 * The step a validation error should send the user back to.
 *
 * Ministry and custom-question answers live under `children.<n>` in the form
 * but are collected on step 4, so they are routed by sub-path rather than by
 * their prefix.
 */
export function stepForPath(path: string): WizardStep {
	const segments = path.split('.');
	const root = segments[0];

	if (root === 'household') return 1;
	if (root === 'guardians' || root === 'emergencyContact') return 2;
	if (root === 'consents') return 5;

	if (root === 'children') {
		const field = segments[2];
		if (
			field === 'ministrySelections' ||
			field === 'interestSelections' ||
			field === 'customData'
		) {
			return 4;
		}
		return 3;
	}

	// An unknown path is most likely a new field on a step we have not mapped.
	// Sending the user to step 1 is wrong but visible; silently dropping the
	// error would reproduce the dead end this module exists to remove.
	return 1;
}

type ErrorNode = { message?: unknown; type?: unknown } | Record<string, unknown>;

function isErrorLeaf(node: unknown): node is { message?: string } {
	return (
		typeof node === 'object' &&
		node !== null &&
		'message' in node &&
		typeof (node as { message?: unknown }).message === 'string'
	);
}

/**
 * Flatten React Hook Form's nested error object into ordered leaves.
 *
 * RHF nests errors to mirror the form shape, and an array field can carry both
 * its own error (`children` is empty) and errors on its entries. Both are
 * reported: dropping the parent would lose "at least one child is required",
 * and dropping the entries would lose every per-child problem.
 */
export function flattenFieldErrors(
	errors: FieldErrors<RegistrationFormInput> | undefined
): Array<{ path: string; message: string }> {
	const out: Array<{ path: string; message: string }> = [];

	const walk = (node: unknown, prefix: string) => {
		if (node === null || typeof node !== 'object') return;

		if (isErrorLeaf(node) && node.message) {
			out.push({ path: prefix, message: node.message });
		}

		for (const [key, value] of Object.entries(node as ErrorNode)) {
			// `message`, `type` and `ref` describe the node itself, not children.
			if (key === 'message' || key === 'type' || key === 'ref' || key === 'types') {
				continue;
			}
			walk(value, prefix ? `${prefix}.${key}` : key);
		}
	};

	if (errors) walk(errors, '');
	return out;
}

/**
 * Every problem, in the order the user will encounter it walking the wizard.
 *
 * Ordering by step and then by path is what makes the submit summary readable:
 * a household problem is listed before a consent one, and guardian 0 before
 * guardian 1, rather than in whatever order the resolver happened to emit.
 */
export function summarizeStepErrors(
	errors: FieldErrors<RegistrationFormInput> | undefined
): StepProblem[] {
	const problems = flattenFieldErrors(errors).map((problem) => ({
		...problem,
		step: stepForPath(problem.path),
	}));

	return problems.sort((a, b) => {
		if (a.step !== b.step) return a.step - b.step;
		return comparePaths(a.path, b.path);
	});
}

/** Order paths so `guardians.2.x` follows `guardians.10.x` correctly. */
function comparePaths(a: string, b: string): number {
	const as = a.split('.');
	const bs = b.split('.');
	for (let i = 0; i < Math.max(as.length, bs.length); i += 1) {
		const x = as[i];
		const y = bs[i];
		if (x === y) continue;
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		const nx = Number(x);
		const ny = Number(y);
		if (Number.isInteger(nx) && Number.isInteger(ny)) return nx - ny;
		return x < y ? -1 : 1;
	}
	return 0;
}

/** The earliest step carrying a problem, or null when the form is clean. */
export function firstInvalidStep(
	errors: FieldErrors<RegistrationFormInput> | undefined
): WizardStep | null {
	const [first] = summarizeStepErrors(errors);
	return first ? first.step : null;
}

/** The first problem on a given step, used to decide what to focus. */
export function firstProblemOnStep(
	errors: FieldErrors<RegistrationFormInput> | undefined,
	step: WizardStep
): StepProblem | undefined {
	return summarizeStepErrors(errors).find((problem) => problem.step === step);
}

/**
 * The index of the first guardian or child carrying an error.
 *
 * Steps 2 and 3 only mount one entry's inputs at a time — a guardian card
 * collapses to a summary, and step 3 shows one child. Focusing a control that
 * is not mounted does nothing, so the step has to open the right entry first.
 */
export function firstInvalidEntryIndex(
	errors: FieldErrors<RegistrationFormInput> | undefined,
	root: 'guardians' | 'children'
): number | undefined {
	for (const problem of summarizeStepErrors(errors)) {
		const segments = problem.path.split('.');
		if (segments[0] !== root) continue;
		const index = Number(segments[1]);
		if (Number.isInteger(index)) return index;
	}
	return undefined;
}

/** Human-facing label for a path, for the submit summary. */
export function describeProblemPath(path: string): string {
	const segments = path.split('.');
	const root = segments[0];

	if (root === 'guardians' && Number.isInteger(Number(segments[1]))) {
		return `Guardian ${Number(segments[1]) + 1}`;
	}
	if (root === 'children' && Number.isInteger(Number(segments[1]))) {
		return `Child ${Number(segments[1]) + 1}`;
	}
	if (root === 'emergencyContact') return 'Emergency contact';
	if (root === 'household') return 'Household';
	if (root === 'consents') return 'Consents';
	return 'Registration';
}

/**
 * Step labels and headings.
 *
 * These live here rather than in the wizard shell so the error summary can name
 * the step that owns a problem without importing the component that renders it.
 */
export const STEPS = [
	{ label: 'Household', title: 'Confirm your household', description: 'Review your household address' },
	{ label: 'Guardians', title: 'Who can collect the children?', description: 'Authorized adults for pickup' },
	{ label: 'Children', title: 'Tell us about your children', description: 'Add each child you are registering' },
	{ label: 'Ministries', title: 'Choose ministry programs', description: 'Select programs for your children' },
	{ label: 'Consents', title: 'Review and submit', description: 'Review and sign required consents' },
] as const;

/** Step heading, used by the summary and by the wizard header. */
export function stepTitle(step: number): string {
	return STEPS[step - 1]?.title ?? `Step ${step}`;
}
