/**
 * DAL — Branding & Profile domain
 *
 * Covers BrandingSettings, entity avatars, and user profile management.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { SupabaseAdapter } from '../database/supabase-adapter';
// Cast to SupabaseAdapter when direct client access is needed (avatars table operations)
const supabaseAdapter = dbAdapter as unknown as SupabaseAdapter;
import { AvatarService } from '../avatar/avatar-service';
import type { BrandingSettings, LeaderProfile, Household } from '../types';
import { normalizeEmail, normalizePhone } from './utils';

// ---------------------------------------------------------------------------
// Branding Settings
// ---------------------------------------------------------------------------

/**
 * Get branding settings for an organisation, defaulting to 'default'.
 */
export async function getBrandingSettings(
    orgId: string = 'default',
): Promise<BrandingSettings | null> {
    const settings = await dbAdapter.listBrandingSettings();
    return settings.find(s => s.org_id === orgId) || null;
}

/**
 * Create or update branding settings for an organisation.
 */
export async function saveBrandingSettings(
    orgId: string = 'default',
    settings: Omit<BrandingSettings, 'setting_id' | 'org_id' | 'created_at' | 'updated_at'>,
): Promise<string> {
    const existingSettings = await getBrandingSettings(orgId);

    if (existingSettings) {
        const updatedSettings = await dbAdapter.updateBrandingSettings(
            existingSettings.setting_id,
            { ...settings },
        );
        return updatedSettings.setting_id;
    } else {
        const newSettings = await dbAdapter.createBrandingSettings({
            org_id: orgId,
            ...settings,
        });
        return newSettings.setting_id;
    }
}

/**
 * Return sensible default branding settings (no org-specific values).
 */
export async function getDefaultBrandingSettings(): Promise<Partial<BrandingSettings>> {
    return {
        app_name: 'gatherKids',
        description:
            "The simple, secure, and smart way to manage your children's ministry. " +
            'Streamline check-ins, track attendance, and keep your community connected.',
        logo_url: undefined,
        use_logo_only: false,
        youtube_url: undefined,
        instagram_url: undefined,
    };
}

// ---------------------------------------------------------------------------
// Avatar / entity photo management
// ---------------------------------------------------------------------------

/**
 * Update an entity's avatar in the generic avatars table.
 */
export async function updateEntityAvatar(
    entityType: 'child' | 'guardian' | 'leader' | 'user',
    entityId: string,
    photoDataUrl: string,
): Promise<string> {
    let storagePath: string;

    if (photoDataUrl.startsWith('data:')) {
        storagePath = photoDataUrl;
    } else if (photoDataUrl.includes('/storage/v1/object/public/')) {
        const urlParts = photoDataUrl.split('/storage/v1/object/public/');
        storagePath = urlParts[1] || photoDataUrl;
    } else {
        storagePath = photoDataUrl;
    }

    const { data, error } = await supabaseAdapter.client.from('avatars').upsert(
        {
            entity_type: entityType,
            entity_id: entityId,
            storage_path: storagePath,
            media_type: photoDataUrl.startsWith('data:') ? 'image/jpeg' : 'image/webp',
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'entity_type,entity_id' },
    ).select();

    if (error) {
        console.error('Failed to update avatars table:', error);
        throw error;
    }

    return entityId;
}

/**
 * Get an entity's avatar storage path.
 */
export async function getEntityAvatar(
    entityType: 'child' | 'guardian' | 'leader' | 'user',
    entityId: string,
): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdapter.client
            .from('avatars')
            .select('storage_path')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // no rows
            console.error('Failed to get avatar:', error);
            return null;
        }

        return data?.storage_path || null;
    } catch (error) {
        console.error('Error getting entity avatar:', error);
        return null;
    }
}

export async function getChildAvatarUrl(childId: string): Promise<string | null> {
    return AvatarService.getAvatarUrl('children', childId);
}

export async function getGuardianAvatarUrl(guardianId: string): Promise<string | null> {
    return AvatarService.getAvatarUrl('guardians', guardianId);
}

export async function getLeaderAvatarUrl(leaderId: string): Promise<string | null> {
    return AvatarService.getAvatarUrl('leaders', leaderId);
}

/**
 * Legacy function — photo is now handled via updateEntityAvatar/avatars table.
 * @deprecated Use updateEntityAvatar instead.
 */
export async function updateChildPhoto(
    _childId: string,
    _photoDataUrl: string,
): Promise<number | string> {
    // No-op in Supabase mode; callers should use updateEntityAvatar.
    return _childId;
}

// ---------------------------------------------------------------------------
// User Profile management
// ---------------------------------------------------------------------------

export interface ActiveProfileTarget {
    target_table: 'ministry_leaders' | 'households';
    target_id: string;
}

/**
 * Determine which profile table to update for a user.
 * Priority: ministry_leaders > households (if both exist).
 */
export async function getActiveProfileTarget(
    user_id: string,
): Promise<ActiveProfileTarget | null> {
    try {
        const leaderProfiles = await dbAdapter.listLeaderProfiles();
        const leaderProfile = leaderProfiles.find(
            profile =>
                profile.leader_id === user_id ||
                profile.email === user_id,
        );

        if (leaderProfile) {
            return {
                target_table: 'ministry_leaders',
                target_id: leaderProfile.leader_id,
            };
        }

        // Check for household via getHouseholdForUser
        const householdId = await dbAdapter.getHouseholdForUser(user_id);
        if (householdId) {
            return {
                target_table: 'households',
                target_id: householdId,
            };
        }

        return null;
    } catch (error) {
        console.error('Error determining active profile target:', error);
        return null;
    }
}

/**
 * Get merged profile data from domain tables.
 */
export async function getMeProfile(user_id: string, auth_email?: string) {
    const target = await getActiveProfileTarget(user_id);
    if (!target) return null;

    try {
        if (target.target_table === 'ministry_leaders') {
            const profile = await dbAdapter.getLeaderProfile(target.target_id);
            return {
                target_table: target.target_table,
                target_id: target.target_id,
                first_name: profile?.first_name,
                last_name: profile?.last_name,
                email: auth_email || profile?.email,
                phone: profile?.phone,
                photo_url: profile?.photo_url,
                avatar_path: profile?.avatar_path,
            };
        } else {
            const household = await dbAdapter.getHousehold(target.target_id);
            return {
                target_table: target.target_table,
                target_id: target.target_id,
                email: auth_email || household?.primary_email,
                phone: household?.primary_phone,
                photo_url: household?.photo_url,
                avatar_path: household?.avatar_path,
            };
        }
    } catch (error) {
        console.error('Error getting profile data:', error);
        return null;
    }
}

/**
 * Save profile data to the appropriate domain table.
 */
export async function saveProfile(
    user_id: string,
    profileData: {
        email?: string;
        phone?: string;
        photoPath?: string;
    },
) {
    const target = await getActiveProfileTarget(user_id);
    if (!target) {
        throw new Error('No profile target found for user');
    }

    const now = new Date().toISOString();

    try {
        if (target.target_table === 'ministry_leaders') {
            const updateData: Partial<LeaderProfile> = { updated_at: now };

            if (profileData.email !== undefined) {
                updateData.email = profileData.email.toLowerCase();
            }
            if (profileData.phone !== undefined) {
                updateData.phone = normalizePhone(profileData.phone);
            }
            if (profileData.photoPath !== undefined) {
                updateData.photo_url = profileData.photoPath;
                updateData.avatar_path = profileData.photoPath;
            }

            await dbAdapter.updateLeaderProfile(target.target_id, updateData);
        } else {
            const updateData: Partial<Household> = { updated_at: now };

            if (profileData.email !== undefined) {
                updateData.primary_email = profileData.email.toLowerCase();
            }
            if (profileData.phone !== undefined) {
                updateData.primary_phone = normalizePhone(profileData.phone);
            }
            if (profileData.photoPath !== undefined) {
                updateData.photo_url = profileData.photoPath;
                updateData.avatar_path = profileData.photoPath;
            }

            await dbAdapter.updateHousehold(target.target_id, updateData);
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        throw error;
    }
}
