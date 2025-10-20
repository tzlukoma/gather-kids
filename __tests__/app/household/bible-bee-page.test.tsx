import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import {
	getBibleBeeMinistry,
	getHouseholdProfile,
	getHouseholdForUser,
} from '@/lib/dal';
import { useHouseholdProfile } from '@/hooks/data';
import HouseholdBibleBeePage from '@/app/household/bible-bee/page';

// Mock the ParentBibleBeeView component since it has complex data dependencies
jest.mock('@/components/gatherKids/parent-bible-bee-view', () => ({
	ParentBibleBeeView: () => (
		<div data-testid="parent-bible-bee-view">Bible Bee Progress</div>
	),
}));

// Mock ScriptureCard component
jest.mock('@/components/gatherKids/scripture-card', () => ({
	__esModule: true,
	default: () => <div data-testid="scripture-card">Scripture Card</div>,
}));

// Mock dependencies
jest.mock('@/contexts/auth-context');
jest.mock('@/lib/dal');
jest.mock('@/hooks/data', () => ({
	useHouseholdProfile: jest.fn(),
}));
jest.mock('dexie-react-hooks', () => ({
	useLiveQuery: jest.fn(() => [{ id: '1', year: 2025 }]),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetBibleBeeMinistry = getBibleBeeMinistry as jest.MockedFunction<
	typeof getBibleBeeMinistry
>;
const mockGetHouseholdProfile = getHouseholdProfile as jest.MockedFunction<
	typeof getHouseholdProfile
>;
const mockGetHouseholdForUser = getHouseholdForUser as jest.MockedFunction<
	typeof getHouseholdForUser
>;
const mockUseHouseholdProfile = useHouseholdProfile as jest.MockedFunction<
	typeof useHouseholdProfile
>;

describe('HouseholdBibleBeePage', () => {
	const mockUser = {
		uid: 'test-user',
		metadata: { household_id: 'test-household' },
	};

	const mockHouseholdProfile = {
		children: [
			{
				child_id: 'child1',
				enrollmentsByCycle: {
					'2025': [
						{
							ministry_id: 'bible-bee',
							ministry_code: 'bible-bee',
							status: 'enrolled',
						},
					],
				},
			},
		],
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockUseAuth.mockReturnValue({
			user: mockUser,
			loading: false,
			userRole: 'GUARDIAN',
		} as any);

		// Mock the hook to return data when called with the correct household ID
		mockUseHouseholdProfile.mockImplementation(
			(householdId: string) => {
				// When householdId is empty string (initial state), return loading
				if (!householdId || householdId === '') {
					return {
						data: null,
						isLoading: true,
					};
				}
				// When householdId is set, return the mock data
				return {
					data: mockHouseholdProfile,
					isLoading: false,
				};
			},
			{ timeout: 5000 }
		);

		mockGetHouseholdForUser.mockResolvedValue('test-household');
		mockGetBibleBeeMinistry.mockResolvedValue({
			ministry_id: 'bible-bee',
			code: 'bible-bee',
			name: 'Bible Bee',
			open_at: '2025-01-01',
		} as any);
	});

	it('shows "Bible Bee Opening Soon" message when before open date', async () => {
		// Set ministry with future open date
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 30);

		mockGetBibleBeeMinistry.mockResolvedValue({
			ministry_id: 'bible-bee',
			code: 'bible-bee',
			name: 'Bible Bee',
			open_at: futureDate.toISOString(),
		} as any);

		render(<HouseholdBibleBeePage />);

		// Wait for the component to finish loading and show the opening soon message
		await waitFor(
			() => {
				expect(screen.getByText('Bible Bee Opening Soon')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(screen.getByText(/The Bible Bee will begin on/)).toBeInTheDocument();
		expect(
			screen.queryByTestId('parent-bible-bee-view')
		).not.toBeInTheDocument();
	});

	it('shows progress cards when on or after open date', async () => {
		// Set ministry with past open date
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 30);

		mockGetBibleBeeMinistry.mockResolvedValue({
			ministry_id: 'bible-bee',
			code: 'bible-bee',
			name: 'Bible Bee',
			open_at: pastDate.toISOString(),
		} as any);

		render(<HouseholdBibleBeePage />);

		await waitFor(
			() => {
				expect(screen.getByText('Bible Bee Progress')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(
			screen.queryByText('Bible Bee Opening Soon')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('parent-bible-bee-view')).toBeInTheDocument();
	});

	it('shows progress cards when no open date is configured', async () => {
		mockGetBibleBeeMinistry.mockResolvedValue({
			ministry_id: 'bible-bee',
			code: 'bible-bee',
			name: 'Bible Bee',
			open_at: null,
		} as any);

		render(<HouseholdBibleBeePage />);

		await waitFor(
			() => {
				expect(screen.getByText('Bible Bee Progress')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(
			screen.queryByText('Bible Bee Opening Soon')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('parent-bible-bee-view')).toBeInTheDocument();
	});

	it('shows "no children enrolled" message when household has no Bible Bee enrollments', async () => {
		mockUseHouseholdProfile.mockReturnValue({
			data: {
				children: [
					{
						child_id: 'child1',
						enrollmentsByCycle: {
							'2025': [
								{
									ministry_id: 'other-ministry',
									ministry_code: 'other-ministry',
									status: 'enrolled',
								},
							],
						},
					},
				],
			},
			isLoading: false,
		} as any);

		mockGetBibleBeeMinistry.mockResolvedValue({
			ministry_id: 'bible-bee',
			code: 'bible-bee',
			name: 'Bible Bee',
			open_at: '2025-01-01',
		} as any);

		render(<HouseholdBibleBeePage />);

		await waitFor(
			() => {
				expect(
					screen.getByText(
						'No children in this household are enrolled in the Bible Bee.'
					)
				).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(
			screen.queryByTestId('parent-bible-bee-view')
		).not.toBeInTheDocument();
	});

	it('handles ministry fetch errors gracefully', async () => {
		mockGetBibleBeeMinistry.mockRejectedValue(
			new Error('Failed to fetch ministry')
		);

		render(<HouseholdBibleBeePage />);

		// Should show cards (default behavior) when error occurs
		await waitFor(
			() => {
				expect(screen.getByText('Bible Bee Progress')).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(
			screen.queryByText('Bible Bee Opening Soon')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('parent-bible-bee-view')).toBeInTheDocument();
	});
});
