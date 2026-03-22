/**
 * DAL — CSV Exports domain
 *
 * CSV export helpers for rosters, attendance, and emergency snapshots.
 * All functions delegate to the Supabase adapter (dbAdapter).  The legacy
 * Dexie/IndexedDB branches have been removed following the demo-mode
 * removal in Wave 3 (issue #191).
 */

import { db as dbAdapter } from '../database/factory';
import type { Guardian } from '../types';
import { normalizeGradeDisplay } from '../gradeUtils';
import { formatPhone } from '@/hooks/usePhoneFormat';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function convertToCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);

    const escapeCSVValue = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (
            str.includes(',') ||
            str.includes('"') ||
            str.includes('\n') ||
            str.includes('\r')
        ) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    const csvRows = [
        headers.map(escapeCSVValue).join(','),
        ...data.map(row =>
            headers.map(fieldName => escapeCSVValue(row[fieldName] ?? '')).join(','),
        ),
    ];
    return csvRows.join('\r\n');
}

// ---------------------------------------------------------------------------
// CSV exports
// ---------------------------------------------------------------------------

/**
 * Export a roster as a CSV blob.
 */
export async function exportRosterCSV<T = unknown>(children: T[]): Promise<Blob> {
    const exportData = children.map(child => {
        const childRec = child as Record<string, unknown>;
        const guardiansArr = childRec['guardians'] as Guardian[] | undefined;
        const primaryGuardian =
            guardiansArr?.find(g => g.is_primary) || guardiansArr?.[0];

        const firstName = (childRec['first_name'] ?? childRec['firstName'] ?? '') as string;
        const lastName = (childRec['last_name'] ?? childRec['lastName'] ?? '') as string;
        const grade = (childRec['grade'] ?? '') as string;
        const activeAttendance = childRec['activeAttendance'] as
            | { check_in_at?: string; event_id?: string }
            | undefined;

        return {
            child_name: `${firstName} ${lastName}`.trim(),
            grade: normalizeGradeDisplay(grade),
            status: activeAttendance ? 'Checked In' : 'Checked Out',
            check_in_time: activeAttendance?.check_in_at
                ? new Date(activeAttendance.check_in_at).toLocaleTimeString()
                : 'N/A',
            event: activeAttendance?.event_id || 'N/A',
            allergies: (childRec['allergies'] ?? 'None') as string,
            medical_notes: (childRec['medical_notes'] ?? 'None') as string,
            household:
                ((childRec['household'] as { name?: string })?.name) || 'N/A',
            primary_guardian: primaryGuardian
                ? `${primaryGuardian.first_name} ${primaryGuardian.last_name}`
                : 'N/A',
            guardian_phone: primaryGuardian
                ? formatPhone(primaryGuardian.mobile_phone)
                : 'N/A',
            guardian_email: primaryGuardian ? primaryGuardian.email : 'N/A',
        };
    });

    const csv = convertToCSV(exportData as Record<string, unknown>[]);
    const BOM = '\uFEFF';
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Export attendance rollup for a date range as a CSV blob.
 */
export async function exportAttendanceRollupCSV(
    startISO: string,
    endISO: string,
): Promise<Blob> {
    const startDate = startISO.split('T')[0];
    const endDate = endISO.split('T')[0];

    const allAttendance = await dbAdapter.listAttendance();
    const attendanceRecords = allAttendance.filter(
        a => a.date >= startDate && a.date <= endDate,
    );

    const childIds = [...new Set(attendanceRecords.map(a => a.child_id))];
    let children: Awaited<ReturnType<typeof dbAdapter.listChildren>> = [];
    if (childIds.length > 0) {
        const allChildren = await dbAdapter.listChildren();
        children = allChildren.filter(c => childIds.includes(c.child_id));
    }

    const childMap = new Map(children.map(c => [c.child_id, c]));

    const exportData = attendanceRecords.map(att => {
        const child = childMap.get(att.child_id);
        return {
            date: att.date,
            child_name: `${child?.first_name} ${child?.last_name}`,
            grade: normalizeGradeDisplay(child?.grade),
            check_in: att.check_in_at
                ? new Date(att.check_in_at).toLocaleTimeString()
                : '',
            check_out: att.check_out_at
                ? new Date(att.check_out_at).toLocaleTimeString()
                : '',
            checked_in_by: att.checked_in_by || 'N/A',
            checked_out_by: att.checked_out_by || 'N/A',
            picked_up_by: att.picked_up_by || 'N/A',
            pickup_method: att.pickup_method || 'N/A',
            event: att.event_id,
        };
    });

    const csv = convertToCSV(exportData as Record<string, unknown>[]);
    const BOM = '\uFEFF';
    return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
}

// ---------------------------------------------------------------------------
// Scripture upload helpers (CSV/JSON)
// ---------------------------------------------------------------------------

/**
 * Validate CSV rows for scripture upload.
 */
export function validateCsvRows(rows: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.reference) {
            errors.push(`Row ${i + 1} missing reference`);
        }
        if (!row.text) {
            errors.push(`Row ${i + 1} missing text`);
        }
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Commit scripture CSV rows to a Bible Bee year/cycle.
 */
export async function commitCsvRowsToYear(
    rows: any[],
    yearId: string,
): Promise<{ inserted: number; updated: number }> {
    return dbAdapter.commitEnhancedCsvRowsToYear(rows, yearId);
}

/**
 * Validate JSON text upload data.
 */
export function validateJsonTextUpload(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('Invalid data format');
        return { isValid: false, errors };
    }

    if (!Array.isArray(data.scriptures)) {
        errors.push('Scriptures must be an array');
        return { isValid: false, errors };
    }

    for (let i = 0; i < data.scriptures.length; i++) {
        const scripture = data.scriptures[i];
        if (!scripture.reference) {
            errors.push(`Scripture ${i + 1} missing reference`);
        }
        if (!scripture.texts || typeof scripture.texts !== 'object') {
            errors.push(`Scripture ${i + 1} missing or invalid texts`);
        }
    }

    return { isValid: errors.length === 0, errors };
}

/**
 * Upload JSON texts (scripture translations) for a year.
 */
export async function uploadJsonTexts(
    yearId: string,
    data: any,
    mode: 'merge' | 'overwrite' = 'merge',
    dryRun: boolean = false,
): Promise<any> {
    return dbAdapter.uploadJsonTexts(yearId, data, mode, dryRun);
}
