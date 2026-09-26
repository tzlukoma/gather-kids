import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/flags/get-gathersystem-bible-bee-household-flag', () => ({
	getGatherSystemBibleBeeHouseholdFlag: jest.fn(),
}));

// Both screens read the child, the session and several queries; this suite is
// about the gate, so each stands in with a marker.
jest.mock('@/components/gatherKids/child-bible-bee-detail', () => ({
	__esModule: true,
	default: ({ allowPhotoUpdates }: { allowPhotoUpdates?: boolean }) => (
		<div data-testid="legacy" data-photos={String(allowPhotoUpdates)} />
	),
}));
jest.mock('@/components/gatherKids/bible-bee-household-gathersystem', () => ({
	BibleBeeHouseholdGatherSystem: () => <div data-testid="gathersystem" />,
}));

import { getGatherSystemBibleBeeHouseholdFlag } from '@/lib/flags/get-gathersystem-bible-bee-household-flag';
import ChildBibleBeePage from '@/app/household/children/[childId]/bible-bee/page';

const mockFlag = getGatherSystemBibleBeeHouseholdFlag as jest.MockedFunction<
	typeof getGatherSystemBibleBeeHouseholdFlag
>;

describe('/household/children/[childId]/bible-bee', () => {
	it('renders the legacy screen, unchanged, when the flag is off', async () => {
		mockFlag.mockResolvedValue(false);
		render(await ChildBibleBeePage());
		expect(screen.getByTestId('legacy')).toHaveAttribute('data-photos', 'true');
		expect(screen.queryByTestId('gathersystem')).not.toBeInTheDocument();
	});

	it('renders the GatherSystem screen when the flag is on', async () => {
		mockFlag.mockResolvedValue(true);
		render(await ChildBibleBeePage());
		expect(screen.getByTestId('gathersystem')).toBeInTheDocument();
		expect(screen.queryByTestId('legacy')).not.toBeInTheDocument();
	});
});
