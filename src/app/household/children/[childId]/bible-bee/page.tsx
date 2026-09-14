import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBoolean } from '@/lib/flags';
import { AuthRole } from '@/lib/auth-types';
import ChildBibleBeeDetail from '@/components/gatherKids/child-bible-bee-detail';

async function getGatherSystemBibleBeeHouseholdFlag(): Promise<boolean> {
	try {
		const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		
		if (!url || !anonKey) {
			return false;
		}

		const cookieStore = await cookies();
		const supabase = createServerClient(url, anonKey, {
			cookies: {
				getAll() {
					return cookieStore.getAll();
				},
			},
		});

		const { data: { user } } = await supabase.auth.getUser();
		const userId = user?.id;
		const role = user?.user_metadata?.role as AuthRole | undefined;

		return await getBoolean('gathersystem_bible_bee_household', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_bible_bee_household flag:', error);
		return false;
	}
}

export default async function ChildBibleBeePage() {
	const useGatherSystemBibleBee = await getGatherSystemBibleBeeHouseholdFlag();

	// For now, both paths use the same component since the child detail view is comprehensive
	// In the future, we could create a GatherSystem-specific version if needed
	return <ChildBibleBeeDetail allowPhotoUpdates={true} />;
}
