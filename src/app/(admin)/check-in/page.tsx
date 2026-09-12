import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBoolean } from '@/lib/flags';
import { AuthRole } from '@/lib/auth-types';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CheckInContentLegacy } from '@/components/gatherKids/check-in-content-legacy';
import { CheckInContentGatherSystem } from '@/components/gatherKids/check-in-content-gathersystem';

async function getGatherSystemDoorFlag(): Promise<boolean> {
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

		return await getBoolean('gathersystem_door', false, { userId, role });
	} catch (error) {
		console.error('Failed to evaluate gathersystem_door flag:', error);
		return false;
	}
}

export default async function Page() {
	const useGatherSystemDoor = await getGatherSystemDoorFlag();

	return (
		<ProtectedRoute
			allowedRoles={[AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN]}>
			{useGatherSystemDoor ? <CheckInContentGatherSystem /> : <CheckInContentLegacy />}
		</ProtectedRoute>
	);
}
