import LegacyCreateAccountPage from './create-account-legacy';
import MagicLinkAccountEntry from './magic-link-account-entry';
import { getGatherSystemAccountEntryFlag } from '@/lib/flags/get-gathersystem-account-entry-flag';

export default async function CreateAccountPage() {
	const useMagicLinkEntry = await getGatherSystemAccountEntryFlag();
	return useMagicLinkEntry ? <MagicLinkAccountEntry /> : <LegacyCreateAccountPage />;
}
