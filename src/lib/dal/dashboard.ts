/**
 * DAL — Dashboard domain
 *
 * Aggregated metrics and stats used by the admin dashboard.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

/**
 * Get registration statistics (household and child counts).
 */
export async function getRegistrationStats(): Promise<{
    householdCount: number;
    childCount: number;
}> {
    try {
        const children = await dbAdapter.listChildren();
        const households = await dbAdapter.listHouseholds();

        const activeChildren = children.filter(c => c.is_active !== false);
        const activeHouseholds = households.filter(h =>
            activeChildren.some(c => c.household_id === h.household_id),
        );

        return {
            householdCount: activeHouseholds.length,
            childCount: activeChildren.length,
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
