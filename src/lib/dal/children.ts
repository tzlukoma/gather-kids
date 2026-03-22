/**
 * DAL — Children domain
 *
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { SupabaseAdapter } from '../database/supabase-adapter';
// Cast to SupabaseAdapter when direct client access is needed (avatars table operations)
const supabaseAdapter = dbAdapter as unknown as SupabaseAdapter;
import type { Child, MinistryEnrollment } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { AvatarService } from '../avatar/avatar-service';

// ---------------------------------------------------------------------------
// Child queries
// ---------------------------------------------------------------------------

/**
 * Get all active children enriched with avatar photo_url.
 */
export async function getAllChildren(): Promise<Child[]> {
    const children = await dbAdapter.listChildren({ isActive: true });
    const childIds = children.map(c => c.child_id);

    const { data: avatars, error } = await supabaseAdapter.client
        .from('avatars')
        .select('entity_id, storage_path')
        .eq('entity_type', 'child')
        .in('entity_id', childIds);

    if (error) {
        console.warn('Failed to load avatars for children:', error);
    }

    const avatarMap = new Map<string, string>();
    if (avatars) {
        avatars.forEach((avatar: { entity_id: string; storage_path: string }) => {
            avatarMap.set(avatar.entity_id, avatar.storage_path);
        });
    }

    return children.map(child => ({
        ...child,
        photo_url: avatarMap.get(child.child_id) || undefined,
    }));
}

/**
 * Get children for a ministry leader based on their assigned ministry IDs.
 * Enriches each child with avatar photo_url.
 */
export async function getChildrenForLeader(
    assignedMinistryIds: string[],
    cycleId: string,
): Promise<Child[]> {
    const enrollments = await dbAdapter.listMinistryEnrollments();
    const filteredEnrollments = enrollments.filter(
        e =>
            assignedMinistryIds.includes(e.ministry_id) &&
            e.cycle_id === cycleId,
    );
    const childIds = [...new Set(filteredEnrollments.map(e => e.child_id))];
    if (childIds.length === 0) return [];

    const allChildren = await dbAdapter.listChildren({ isActive: true });
    const children = allChildren.filter(c => childIds.includes(c.child_id));

    const { data: avatars, error } = await supabaseAdapter.client
        .from('avatars')
        .select('entity_id, storage_path')
        .eq('entity_type', 'child')
        .in('entity_id', childIds);

    if (error) {
        console.warn('Failed to load avatars for children:', error);
    }

    const avatarMap = new Map<string, string>();
    if (avatars) {
        avatars.forEach((avatar: { entity_id: string; storage_path: string }) => {
            avatarMap.set(avatar.entity_id, avatar.storage_path);
        });
    }

    return children.map(child => ({
        ...child,
        photo_url: avatarMap.get(child.child_id) || undefined,
    }));
}

/**
 * Get a single child by ID, enriched with photo_url from the avatars table.
 */
export async function getChild(childId: string): Promise<Child | null> {
    const child = await dbAdapter.getChild(childId);
    if (!child) return null;

    const { data: avatar, error } = await supabaseAdapter.client
        .from('avatars')
        .select('storage_path')
        .eq('entity_type', 'child')
        .eq('entity_id', childId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.warn('Failed to load avatar for child:', error);
    }

    return { ...child, photo_url: avatar?.storage_path || undefined };
}

/**
 * Get child profile with avatar URL.
 */
export async function getChildWithAvatar(childId: string) {
    const child = await dbAdapter.getChild(childId);
    if (!child) return null;

    const avatarUrl = await AvatarService.getAvatarUrl('children', childId);

    return { ...child, avatarUrl };
}

/**
 * Get all ministry enrollments for a cycle.
 */
export async function getMinistryEnrollmentsByCycle(
    cycleId: string,
): Promise<MinistryEnrollment[]> {
    return dbAdapter.listMinistryEnrollments(undefined, undefined, cycleId);
}

// ---------------------------------------------------------------------------
// Child mutations (thin adapters)
// ---------------------------------------------------------------------------

export async function addChild(
    householdId: string,
    child: Omit<Child, 'child_id'>,
    _cycleId: string,
): Promise<Child> {
    const childWithId = {
        ...child,
        child_id: uuidv4(),
        household_id: householdId,
        is_active: true,
    };
    return await dbAdapter.createChild(childWithId);
}

export async function updateChild(
    childId: string,
    data: Partial<Child>,
): Promise<void> {
    await dbAdapter.updateChild(childId, data);
}

export async function softDeleteChild(childId: string): Promise<void> {
    await dbAdapter.softDeleteChild(childId);
}

export async function reactivateChild(childId: string): Promise<void> {
    await dbAdapter.reactivateChild(childId);
}

export async function addChildEnrollment(
    childId: string,
    ministryId: string,
    cycleId: string,
    customFields?: any,
): Promise<void> {
    await dbAdapter.addEnrollment(childId, ministryId, cycleId, customFields);
}

export async function removeChildEnrollment(
    childId: string,
    ministryId: string,
    cycleId: string,
): Promise<void> {
    await dbAdapter.removeEnrollment(childId, ministryId, cycleId);
}

export async function updateChildEnrollmentFields(
    childId: string,
    ministryId: string,
    cycleId: string,
    customFields: any,
): Promise<void> {
    await dbAdapter.updateEnrollmentFields(childId, ministryId, cycleId, customFields);
}

// updateChildPhoto is exported from branding.ts
