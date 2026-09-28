import { render, screen } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-context';
import { useHouseholdProfile } from '@/hooks/data';
import { useGuardianShell } from '@/components/gatherKids/guardian-shell-context';
import { useGuardianHouseholdProfile } from '@/hooks/use-guardian-household-profile';
import ChildProfilePage from '@/app/household/children/[childId]/page';

jest.mock('next/navigation', () => ({
	useParams: () => ({ childId: 'child-1' }),
}));
jest.mock('@/contexts/auth-context');
jest.mock('@/hooks/data', () => ({ useHouseholdProfile: jest.fn() }));
jest.mock('@/components/gatherKids/guardian-shell-context', () => ({
	useGuardianShell: jest.fn(),
}));
jest.mock('@/hooks/use-guardian-household-profile', () => ({
	useGuardianHouseholdProfile: jest.fn(),
}));
jest.mock('@/components/gatherKids/child-card', () => ({
	ChildCard: () => <div data-testid="legacy-child-card" />,
}));
jest.mock('@/components/gatherKids/guardian-child-gathersystem', () => ({
	GuardianChildGatherSystem: ({ child }: { child: { first_name: string } }) => (
		<div data-testid="gathersystem-child">{child.first_name}</div>
	),
}));
jest.mock('@/components/skeletons/guardian-skeleton', () => ({
	GuardianSkeleton: () => <div data-testid="guardian-skeleton" />,
}));
jest.mock('next/dynamic', () => () => () => null);

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseHouseholdProfile = useHouseholdProfile as jest.MockedFunction<typeof useHouseholdProfile>;
const mockUseGuardianShell = useGuardianShell as jest.MockedFunction<typeof useGuardianShell>;
const mockUseGuardianHouseholdProfile = useGuardianHouseholdProfile as jest.MockedFunction<
	typeof useGuardianHouseholdProfile
>;

const profile = {
	household: { household_id: 'h1', name: 'Test Household' },
	guardians: [],
	emergencyContact: null,
	children: [{ child_id: 'child-1', household_id: 'h1', first_name: 'Ada', last_name: 'Test' }],
	registrations: [],
} as never;

beforeEach(() => {
	jest.clearAllMocks();
	mockUseAuth.mockReturnValue({ user: { uid: 'u1', metadata: { household_id: 'h1' } } } as never);
	mockUseHouseholdProfile.mockReturnValue({ data: profile, isLoading: false } as never);
	mockUseGuardianHouseholdProfile.mockReturnValue({
		profileData: profile,
		isLoading: false,
		error: null,
		householdResolved: true,
		householdMissing: false,
	} as never);
});

describe('/household/children/[childId]', () => {
	it('renders the legacy card with the flag off', () => {
		mockUseGuardianShell.mockReturnValue(false);
		render(<ChildProfilePage />);
		expect(screen.getByTestId('legacy-child-card')).toBeInTheDocument();
		expect(screen.queryByTestId('gathersystem-child')).not.toBeInTheDocument();
		expect(mockUseGuardianHouseholdProfile).not.toHaveBeenCalled();
	});

	it('renders the GatherSystem page with the flag on, without the registration redirect', () => {
		mockUseGuardianShell.mockReturnValue(true);
		render(<ChildProfilePage />);
		expect(screen.getByTestId('gathersystem-child')).toHaveTextContent('Ada');
		expect(screen.queryByTestId('legacy-child-card')).not.toBeInTheDocument();
		expect(mockUseGuardianHouseholdProfile).toHaveBeenCalledWith({ redirectToRegistration: false });
	});

	it('shows the skeleton until the household resolves', () => {
		mockUseGuardianShell.mockReturnValue(true);
		mockUseGuardianHouseholdProfile.mockReturnValue({
			profileData: undefined,
			isLoading: false,
			error: null,
			householdResolved: false,
			householdMissing: false,
		} as never);
		render(<ChildProfilePage />);
		expect(screen.getByTestId('guardian-skeleton')).toBeInTheDocument();
	});

	it('says the child is not found when they are not in the household', () => {
		mockUseGuardianShell.mockReturnValue(true);
		mockUseGuardianHouseholdProfile.mockReturnValue({
			profileData: { ...(profile as object), children: [] },
			isLoading: false,
			error: null,
			householdResolved: true,
			householdMissing: false,
		} as never);
		render(<ChildProfilePage />);
		expect(screen.getByRole('heading', { name: 'Child not found' })).toBeInTheDocument();
	});

	it('says the child is not found when the guardian has no household', () => {
		mockUseGuardianShell.mockReturnValue(true);
		mockUseGuardianHouseholdProfile.mockReturnValue({
			profileData: undefined,
			isLoading: false,
			error: null,
			householdResolved: true,
			householdMissing: true,
		} as never);
		render(<ChildProfilePage />);
		expect(screen.getByRole('heading', { name: 'Child not found' })).toBeInTheDocument();
	});
});
