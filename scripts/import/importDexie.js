#!/usr/bin/env node
/*
  Import Dexie (IndexedDB) export JSON into Supabase.
  Usage:
    node -r dotenv/config scripts/import/importDexie.js /path/to/gather-kids-export.json

  The script expects a JSON file with top-level keys matching Dexie stores, e.g.
  { households: [...], guardians: [...], children: [...], competitionYears: [...], scriptures: [...] }
  It maps camelCase fields to snake_case DB columns and upserts rows in a safe order.
*/

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Accept --dry-run / -n flag and --tables flag
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');
// --tables=households,children  OR --tables households,children
let tablesToImport = null;
const tablesArgIndex = args.findIndex(
	(a) => a === '--tables' || a.startsWith('--tables=')
);
if (tablesArgIndex !== -1) {
	const a = args[tablesArgIndex];
	let val = null;
	if (a.includes('=')) val = a.split('=')[1];
	else val = args[tablesArgIndex + 1];
	if (val)
		tablesToImport = val
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
}
const fileArg =
	args.find((a) => !a.startsWith('-')) ||
	path.resolve('scripts/seed/gather-kids-export.json');
if (!fs.existsSync(fileArg)) {
	console.error('Export file not found:', fileArg);
	console.error(
		'Run the Dexie export in the browser and pass the JSON file path as the first argument.'
	);
	process.exit(1);
}

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ??
	process.env.SUPABASE_SERVICE_ROLE ??
	(fs.existsSync(process.env.HOME + '/.supabase/local-service-role-key')
		? fs
				.readFileSync(
					process.env.HOME + '/.supabase/local-service-role-key',
					'utf8'
				)
				.trim()
		: undefined);
if (!SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE, or ensure ~/.supabase/local-service-role-key exists'
	);
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false },
});
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// mapping report collector
const mappingReport = {
	households: {},
	children: {},
	guardians: {},
};

function camelToSnake(s) {
	return s.replace(/([A-Z])/g, (letter) => '_' + letter.toLowerCase());
}

function mapRecord(table, rec) {
	// table-specific mapping overrides
	const overrides = {
		households: {
			// accept both camelCase and snake_case keys for client-generated id
			householdId: 'external_id',
			household_id: 'external_id',
			name: 'household_name',
			address_line1: 'address',
			preferredScriptureTranslation: 'preferred_scripture_translation',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		scriptures: {
			competitionYearId: 'competition_year_id',
			// export has both `text` (single translation) and `texts` (multi-translation),
			// our DB uses `texts jsonb` and `reference` and `order`.
			text: 'texts',
			texts: 'texts',
			translation: 'texts',
			sortOrder: 'order',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			id: 'external_id',
		},
		competitionYears: {
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		studentScriptures: {
			childId: 'child_id',
			competitionYearId: 'competition_year_id',
			scriptureId: 'scripture_id',
			completedAt: 'completed_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		studentEssays: {
			childId: 'child_id',
			competitionYearId: 'competition_year_id',
			submittedAt: 'submitted_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		guardians: {
			guardianId: 'external_id',
			guardian_id: 'external_id',
			householdId: 'external_household_id',
			household_id: 'external_household_id',
			mobilePhone: 'mobile_phone',
			mobile_phone: 'mobile_phone',
			isPrimary: 'is_primary',
			is_primary: 'is_primary',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
		children: {
			// map child id and household id to external columns so we don't need to change PK types
			childId: 'external_id',
			child_id: 'external_id',
			householdId: 'external_household_id',
			household_id: 'external_household_id',
			dob: 'birth_date',
			childMobile: 'mobile_phone',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	};

	const tableOverrides = overrides[table] || {};
	const out = {};
	for (const k of Object.keys(rec)) {
		const v = rec[k];
		if (k in tableOverrides) {
			out[tableOverrides[k]] = v;
		} else {
			// default: convert camelCase to snake_case
			out[camelToSnake(k)] = v;
		}
	}

	// preserve original id fields as PK candidates in addition to external_id fields
	if (table === 'guardians') {
		if (rec.guardian_id && !out.guardian_id) out.guardian_id = rec.guardian_id;
		if (rec.guardianId && !out.guardian_id) out.guardian_id = rec.guardianId;
	}
	if (table === 'children') {
		if (rec.child_id && !out.child_id) out.child_id = rec.child_id;
		if (rec.childId && !out.child_id) out.child_id = rec.childId;
	}
	return out;
}

async function chunkUpsert(table, rows, chunkSize = 200) {
	const dbTable = camelToSnake(table);
	for (let i = 0; i < rows.length; i += chunkSize) {
		const batch = rows.slice(i, i + chunkSize);
		console.log(
			`Upserting ${batch.length} rows into ${dbTable} (batch ${
				Math.floor(i / chunkSize) + 1
			})`
		);
		if (dryRun) {
			console.log(
				`[dry-run] would upsert ${batch.length} rows into ${dbTable}`
			);
			continue;
		}
		const { data, error } = await supabase
			.from(dbTable)
			.upsert(batch)
			.select('*');
		if (error) {
			console.error(`Error upserting into ${dbTable}:`, error);
			throw error;
		}
		console.log(`Upserted ${data?.length ?? 0} rows into ${dbTable}`);

		// collect mapping external_id -> server PK when available
		if (data && data.length > 0) {
			for (const row of data) {
				// households: external_id -> household_id
				if (dbTable === 'households' && row.external_id && row.household_id) {
					mappingReport.households[row.external_id] = row.household_id;
				}
				// children: external_id -> child_id
				if (dbTable === 'children' && row.external_id && row.child_id) {
					mappingReport.children[row.external_id] = row.child_id;
				}
				// guardians: external_id -> guardian_id
				if (dbTable === 'guardians' && row.external_id && row.guardian_id) {
					mappingReport.guardians[row.external_id] = row.guardian_id;
				}
			}
		}
	}
}

async function run() {
	const parsed = JSON.parse(fs.readFileSync(fileArg, 'utf8'));
	// support exports wrapped like { exportedAt, dbName, data: { ... } }
	const raw = parsed.data ?? parsed;

	// Order matters: parents first, then children and relational tables, then student-related data
	let order = [
		'households',
		'guardians',
		'emergency_contacts',
		'users',
		'competitionYears',
		'ministries',
		'children',
		'child_year_profiles',
		'registrations',
		'ministries',
		'ministry_enrollments',
		'leader_assignments',
		'events',
		'attendance',
		'incidents',
		'audit_logs',
		'scriptures',
		'gradeRules',
		'studentScriptures',
		'studentEssays',
	];

	if (tablesToImport && tablesToImport.length > 0) {
		console.log('Import restricted to tables:', tablesToImport.join(','));
		order = order.filter((t) => tablesToImport.includes(t));
	}

	// keep maps from external ids -> primary keys for tables where we imported external ids
	const externalMaps = {
		households: {},
	};

	for (const table of order) {
		const storeName = table;
		const items =
			raw[storeName] ||
			raw[storeName.replace(/_/g, '')] ||
			raw[storeName.replace(/s$/, '')] ||
			[];
		if (!items || items.length === 0) {
			continue;
		}
		// Map each record
		const mapped = items.map((r) => mapRecord(table, r));

		// For households: ensure a non-null PK exists before upsert
		if (table === 'households') {
			for (const m of mapped) {
				if (!m.household_id) m.household_id = uuidv4();
			}
		}

		// For children: ensure child_id exists; we'll resolve household_id from external_household_id below
		if (table === 'children') {
			for (const m of mapped) {
				if (!m.child_id) m.child_id = uuidv4();
			}
			// resolve household_id from previously-built households external map if available
			const extIds = Array.from(
				new Set(mapped.map((m) => m.external_household_id).filter(Boolean))
			);
			if (extIds.length > 0) {
				// fetch mapping from households if we haven't already
				if (
					!externalMaps.households ||
					Object.keys(externalMaps.households).length === 0
				) {
					try {
						const { data: hhData, error: hhErr } = await supabase
							.from('households')
							.select('household_id, external_id')
							.in('external_id', extIds);
						if (hhErr) throw hhErr;
						for (const h of hhData || []) {
							externalMaps.households[h.external_id] = h.household_id;
						}

						// For guardians: ensure guardian_id exists and resolve household mapping
						if (table === 'guardians') {
							for (const m of mapped) {
								if (!m.guardian_id) m.guardian_id = uuidv4();
							}
							// resolve household_id from households external mapping if available
							const extHouseIds = Array.from(
								new Set(
									mapped.map((m) => m.external_household_id).filter(Boolean)
								)
							);
							if (extHouseIds.length > 0) {
								if (
									!externalMaps.households ||
									Object.keys(externalMaps.households).length === 0
								) {
									try {
										const { data: hhData, error: hhErr } = await supabase
											.from('households')
											.select('household_id, external_id')
											.in('external_id', extHouseIds);
										if (hhErr) throw hhErr;
										for (const h of hhData || []) {
											externalMaps.households[h.external_id] = h.household_id;
										}
									} catch (e) {
										console.error(
											'Failed to fetch households mapping for guardians:',
											e?.message || e
										);
									}
								}
								for (const m of mapped) {
									if (m.external_household_id) {
										m.household_id =
											externalMaps.households[m.external_household_id] || null;
									}
								}
							}
						}
					} catch (e) {
						console.error(
							'Failed to fetch households mapping:',
							e?.message || e
						);
					}
				}
				// apply mapping
				for (const m of mapped) {
					if (m.external_household_id) {
						m.household_id =
							externalMaps.households[m.external_household_id] || null;
					}
				}
			}
		}
		await chunkUpsert(table, mapped, 200);
	}

	// write mapping report to disk
	try {
		const mapsDir = path.join(__dirname, '..', 'import', 'mappings');
		if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });
		const outPath = path.join(mapsDir, `${Date.now()}-mapping.json`);
		fs.writeFileSync(outPath, JSON.stringify(mappingReport, null, 2), 'utf8');
		console.log('Mapping report written to', outPath);
	} catch (e) {
		console.error('Failed to write mapping report:', e?.message || e);
	}

	console.log('Import complete.');
}

run().catch((err) => {
	console.error('Import failed:', err?.message || err);
	process.exit(1);
});
