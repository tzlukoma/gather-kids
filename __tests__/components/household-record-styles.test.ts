import { HOUSEHOLD_RECORD_STYLES } from '@/components/gatherKids/household-record-styles';

/**
 * The legacy map is what the flag-off `/household` and the admin registration
 * view render. It must stay exactly what `HouseholdProfile` hard-coded before
 * #378, so a GatherSystem change can never leak into those screens.
 */
describe('household record styles', () => {
	it('keeps the legacy treatment identical to the pre-#378 markup', () => {
		expect(HOUSEHOLD_RECORD_STYLES.legacy).toEqual({
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
		});
	});

	it('gives both treatments the same keys, so neither can miss a slot', () => {
		expect(Object.keys(HOUSEHOLD_RECORD_STYLES.gathersystem).sort()).toEqual(
			Object.keys(HOUSEHOLD_RECORD_STYLES.legacy).sort()
		);
	});
});
