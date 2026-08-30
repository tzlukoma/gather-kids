/**
 * DAL — Dashboard domain
 *
 * Aggregated metrics and stats used by the admin dashboard.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { getActiveCycleRegistrationStats } from './cycle-scoping';

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

/**
 * Get registration statistics for the active registration cycle
 * (household and child counts via registrations ∪ enrolled enrollments).
 */
export async function getRegistrationStats(): Promise<{
    householdCount: number;
    childCount: number;
    cycleId?: string;
    cycleName?: string;
}> {
    try {
        const stats = await getActiveCycleRegistrationStats('union');
        return {
            householdCount: stats.householdCount,
            childCount: stats.childCount,
            cycleId: stats.cycleId,
            cycleName: stats.cycleName,
        };
    } catch (error) {
        console.warn('Error fetching registration stats:', error);
        return { householdCount: 0, childCount: 0 };
    }
}

/**
 * Get all auth users for admin user management via API endpoint.
 */
export async function getAllUsers(): Promise<
    Array<{
        id: string;
        email: string;
        role: string;
        name: string;
        email_confirmed: boolean;
        last_sign_in: string | null;
        created_at: string;
        user_metadata: Record<string, unknown>;
    }>
> {
    const response = await fetch('/api/users');
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
    }
    const data = await response.json();
    return data.users;
}
