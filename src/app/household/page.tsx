import { useAuth } from '@/contexts/auth-context';
import { HouseholdProfile } from '@/components/gatherKids/household-profile';

export default function GuardianHouseholdPage() {
	const { user } = useAuth();

	return (
		<div>
			<HouseholdProfile
				householdId={user?.metadata.household_id || ''}
				readOnly={true}
			/>
		</div>
	);
}
