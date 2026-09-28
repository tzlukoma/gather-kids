/**
 * Class strings for the household record (`HouseholdProfile`), in its two
 * treatments.
 *
 * `legacy` is exactly what the component rendered before #378, character for
 * character, so the flag-off `/household` and the admin registration view are
 * unchanged. `gathersystem` is the signed `2b household` treatment (frames
 * 94:2 and 94:266), used only by `/household/details`, which exists only with
 * `gathersystem_guardian` on.
 *
 * One map rather than a second component: the record carries every household
 * edit surface — guardians, emergency contact, address, children, enrollments,
 * photos, delete and reactivate — and a copy would be a second place for any
 * of them to drift.
 */

export type HouseholdRecordVariant = 'legacy' | 'gathersystem';

export type HouseholdRecordStyles = {
	/** `Bennett Household`. */
	title: string;
	/** `Registered on …`. */
	subtitle: string;
	/** date-fns pattern for the registration date. */
	registeredFormat: string;
	/** Row holding `Add Guardian` / `Add Child`. */
	addActions: string;
	addButton: string;
	/** Card surface for the guardians card and each child card. */
	card: string;
	/** `Guardians & Contacts` and each child's name. */
	cardTitle: string;
	cardTitleIcon: string;
	/** A guardian's, the emergency contact's, or the address's heading. */
	personHeading: string;
	/** Small edit / delete icon buttons beside a heading. */
	iconButton: string;
	iconButtonDestructive: string;
	/** The InfoItem label and value. */
	infoLabel: string;
	infoValue: string;
	infoIcon: string;
	/** `Program Enrollments & Interests`. */
	sectionHeading: string;
	sectionHeadingIcon: string;
	/** `Fall 2026 Registration Year` accordion trigger. */
	cycleTrigger: string;
	/** One program row. */
	programRow: string;
	programName: string;
	/** The status pill, when the variant draws its own instead of `Badge`. */
	statusPill: string | null;
	statusEnrolled: string;
	statusInterested: string;
	/** Avatar fallback: an icon in legacy, initials in GatherSystem. */
	avatarFallback: string;
	avatarInitials: boolean;
	/** Page grid, and where the guardians card sits within it. */
	grid: string;
	guardiansCard: string;
	childrenColumn: string;
	/** On phones, whether children come before guardians (the 94:266 order). */
	childrenFirst: boolean;
};

export const HOUSEHOLD_RECORD_STYLES: Record<HouseholdRecordVariant, HouseholdRecordStyles> = {
	legacy: {
		title: 'text-3xl font-bold font-headline',
		subtitle: 'text-muted-foreground',
		registeredFormat: 'PPpp',
		addActions: 'flex gap-4 justify-start',
		addButton: '',
		card: '',
		cardTitle: 'font-headline flex items-center gap-2',
		cardTitleIcon: '',
		personHeading: 'font-semibold',
		iconButton: 'h-6 w-6 p-0',
		iconButtonDestructive: 'h-6 w-6 p-0 text-red-600 hover:text-red-700',
		infoLabel: 'text-sm text-muted-foreground',
		infoValue: 'font-medium',
		infoIcon: 'text-muted-foreground mt-1',
		sectionHeading: 'font-semibold mb-2 flex items-center gap-2',
		sectionHeadingIcon: '',
		cycleTrigger: '',
		programRow: 'p-3 rounded-md border bg-muted/25',
		programName: 'font-medium',
		statusPill: null,
		statusEnrolled: '',
		statusInterested: '',
		avatarFallback: '',
		avatarInitials: false,
		grid: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
		guardiansCard: 'lg:col-span-1 h-fit',
		childrenColumn: 'lg:col-span-2 space-y-6',
		childrenFirst: false,
	},
	gathersystem: {
		title: 'text-display-28 font-bold text-foreground',
		subtitle: 'text-body-14 text-muted-foreground',
		registeredFormat: "MMMM d, yyyy 'at' h:mm a",
		addActions: 'grid grid-cols-2 gap-3 sm:flex sm:justify-start',
		addButton: 'bg-card text-body-14 font-semibold',
		card: 'shadow-card border-border',
		cardTitle: 'flex items-center gap-2 text-title-16 font-semibold leading-(--text-title-16--line-height) text-foreground',
		cardTitleIcon: 'size-4 shrink-0 text-primary',
		personHeading: 'text-body-14 font-semibold text-foreground',
		// 44px on a phone, like the child actions menu (#553); 36px beside a
		// heading once there is a pointer to aim with.
		iconButton: 'size-11 sm:size-9 p-0 text-muted-foreground hover:text-primary',
		iconButtonDestructive: 'size-11 sm:size-9 p-0 text-destructive hover:text-destructive',
		// Body/13, not Label/12: the label token is weight 600, and the frame's
		// field labels are regular, quieter than the values under them.
		infoLabel: 'text-body-13 text-muted-foreground',
		infoValue: 'text-body-14 text-foreground',
		infoIcon: 'text-muted-foreground mt-0.5',
		sectionHeading: 'mb-2 flex items-center gap-2 text-body-14 font-semibold text-foreground',
		sectionHeadingIcon: 'size-4 shrink-0 text-primary',
		cycleTrigger: 'text-body-14 font-medium',
		programRow: 'rounded-md border border-border bg-background px-3.5 py-3',
		programName: 'text-body-14 text-foreground',
		statusPill: 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-label-12',
		statusEnrolled: 'bg-brand-aqua/15 text-brand-teal',
		statusInterested: 'bg-muted text-muted-foreground',
		avatarFallback: 'bg-brand-aqua/15 text-brand-teal text-headline-22 font-semibold',
		avatarInitials: true,
		grid: 'flex flex-col gap-5 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6',
		guardiansCard: 'h-fit lg:col-start-1 lg:row-start-1',
		childrenColumn: 'flex flex-col gap-5 lg:col-start-2 lg:row-start-1',
		childrenFirst: true,
	},
};
