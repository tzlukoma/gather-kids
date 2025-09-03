#!/usr/bin/env node

/**
 * This script fixes the emergency_contacts table by:
 * 1. Identifying emergency_contacts with invalid household_id_uuid foreign keys
 * 2. Finding matching households by external_id
 * 3. Updating the emergency_contacts with correct household_id_uuid values
 * 4. Setting remaining invalid references to NULL
 */

import pg from 'pg';
const { Pool } = pg;

// Configure DB connection from environment or use local Supabase defaults
const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		'postgresql://postgres:postgres@localhost:54322/postgres',
});

async function fixEmergencyContacts() {
	const client = await pool.connect();

	try {
		// Start a transaction
		await client.query('BEGIN');

		console.log('Starting emergency_contacts foreign key fix...');

		// 1. Check if tables and columns exist
		const checkColumns = await client.query(`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts') AS emergency_contacts_exists,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'households') AS households_exists,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_contacts' AND column_name = 'household_id_uuid') AS ec_uuid_exists,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_contacts' AND column_name = 'household_id') AS ec_id_exists,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'household_uuid') AS hh_uuid_exists,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'external_id') AS hh_ext_id_exists
    `);

		const {
			emergency_contacts_exists,
			households_exists,
			ec_uuid_exists,
			ec_id_exists,
			hh_uuid_exists,
			hh_ext_id_exists,
		} = checkColumns.rows[0];

		if (!emergency_contacts_exists) {
			console.log('emergency_contacts table does not exist, nothing to fix');
			return;
		}

		if (!households_exists) {
			console.log('households table does not exist, nothing to fix');
			return;
		}

		if (!ec_uuid_exists) {
			console.log(
				'emergency_contacts.household_id_uuid column does not exist, nothing to fix'
			);
			return;
		}

		// 2. Drop the FK constraint if it exists
		console.log('Dropping foreign key constraint if it exists...');
		await client.query(`
      ALTER TABLE emergency_contacts 
      DROP CONSTRAINT IF EXISTS fk_emergency_contacts_household;
    `);

		// 3. Count and identify invalid references
		if (ec_uuid_exists && hh_uuid_exists) {
			const invalidRefs = await client.query(`
        SELECT COUNT(*) AS invalid_count
        FROM emergency_contacts e
        LEFT JOIN households h ON e.household_id_uuid = h.household_uuid
        WHERE e.household_id_uuid IS NOT NULL 
          AND h.household_uuid IS NULL;
      `);

			const { invalid_count } = invalidRefs.rows[0];
			console.log(
				`Found ${invalid_count} emergency contacts with invalid household references`
			);

			if (invalid_count > 0) {
				// 4. Find potential matches by external_id if both columns exist
				if (ec_id_exists && hh_ext_id_exists) {
					const updateResult = await client.query(`
            WITH updated_rows AS (
              UPDATE emergency_contacts e
              SET household_id_uuid = h.household_uuid
              FROM households h
              WHERE e.household_id = h.external_id
                AND e.household_id IS NOT NULL
                AND (
                  e.household_id_uuid IS NULL OR
                  NOT EXISTS (
                    SELECT 1 FROM households h2
                    WHERE e.household_id_uuid = h2.household_uuid
                  )
                )
              RETURNING 1
            )
            SELECT COUNT(*) AS updated_count FROM updated_rows;
          `);

					console.log(
						`Updated ${updateResult.rows[0].updated_count} emergency contacts with matching external IDs`
					);
				}

				// 5. Set remaining invalid references to NULL
				const nullResult = await client.query(`
          UPDATE emergency_contacts e
          SET household_id_uuid = NULL
          WHERE household_id_uuid IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM households h
              WHERE e.household_id_uuid = h.household_uuid
            )
          RETURNING *;
        `);

				console.log(`Set ${nullResult.rowCount} invalid references to NULL`);
			}
		}

		// 6. Add the FK constraint back, but make it deferrable
		console.log('Adding foreign key constraint as deferrable...');
		await client.query(`
      ALTER TABLE emergency_contacts
      ADD CONSTRAINT fk_emergency_contacts_household
      FOREIGN KEY (household_id_uuid) REFERENCES households(household_uuid)
      DEFERRABLE INITIALLY DEFERRED;
    `);

		// Commit the transaction
		await client.query('COMMIT');
		console.log('Emergency contacts fix completed successfully!');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Error fixing emergency contacts:', err);
		throw err;
	} finally {
		client.release();
		pool.end();
	}
}

// Run the fix function
fixEmergencyContacts().catch((err) => {
	console.error('Script failed:', err);
	process.exit(1);
});
