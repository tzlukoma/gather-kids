/**
 * Count children currently on site from attendance rows.
 *
 * The legacy door used to count open rows. A double-submit leaves two open
 * rows for one child, so that number drifted from the roster (#482).
 */
export function countChildrenOnSite(
	attendance: Array<{ child_id?: string | null; check_out_at?: string | null }>
): number {
	const ids = new Set<string>();
	for (const row of attendance) {
		if (!row.check_out_at && row.child_id) {
			ids.add(row.child_id);
		}
	}
	return ids.size;
}
