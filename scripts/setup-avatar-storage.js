#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

// Environment setup
const useLocal = process.argv.includes('--local');
const projectRef = process.env.SUPABASE_PROJECT_REF;

try {
	// Determine command based on environment
	let baseCommand = useLocal
		? 'supabase'
		: `supabase --project-ref ${projectRef}`;

	console.log('🪣 Setting up avatar storage bucket...');

	// Create the avatars bucket (public for MVP, can be made private later)
	execSync(`${baseCommand} storage create bucket avatars --public`, {
		stdio: 'inherit',
	});

	// Create migration file for child_avatars table
	const timestamp = Date.now();
	const migrationFile = `./supabase/migrations/${timestamp}_add_avatar_tables.sql`;

	const sqlContent = `
-- Create table for storing avatar references
CREATE TABLE IF NOT EXISTS child_avatars (
  child_id uuid PRIMARY KEY REFERENCES children(child_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardian_avatars (
  guardian_id uuid PRIMARY KEY REFERENCES guardians(guardian_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leader_avatars (
  leader_id uuid PRIMARY KEY REFERENCES leader_profiles(leader_id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add row level security policies
ALTER TABLE child_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE leader_avatars ENABLE ROW LEVEL SECURITY;

-- Child avatar policies
CREATE POLICY family_read_child_avatars ON child_avatars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_upsert_child_avatars ON child_avatars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_update_child_avatars ON child_avatars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM children c
      JOIN user_households uh ON uh.household_id = c.household_id
      WHERE c.child_id = child_avatars.child_id AND uh.user_id = auth.uid()::text
    )
  );

-- Guardian avatar policies
CREATE POLICY family_read_guardian_avatars ON guardian_avatars
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_upsert_guardian_avatars ON guardian_avatars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

CREATE POLICY family_update_guardian_avatars ON guardian_avatars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM guardians g
      JOIN user_households uh ON uh.household_id = g.household_id
      WHERE g.guardian_id = guardian_avatars.guardian_id AND uh.user_id = auth.uid()::text
    )
  );

-- Leader avatar policies (can be managed by admins)
CREATE POLICY admin_manage_leader_avatars ON leader_avatars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE user_id = auth.uid()::text AND role = 'admin'
    )
  );

-- Allow leaders to manage their own avatars
CREATE POLICY leader_manage_own_avatar ON leader_avatars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leader_profiles WHERE leader_id = leader_avatars.leader_id AND user_id = auth.uid()::text
    )
  );

-- Allow all authenticated users to view leader avatars
CREATE POLICY all_view_leader_avatars ON leader_avatars
  FOR SELECT USING (auth.role() = 'authenticated');
  `;

	fs.writeFileSync(migrationFile, sqlContent);
	console.log(`✅ Created migration file: ${migrationFile}`);

	// Apply the migration if local
	if (useLocal) {
		console.log('🔄 Applying migration to local database...');
		execSync('supabase db reset', { stdio: 'inherit' });
	}

	console.log('✅ Avatar storage setup complete!');
} catch (error) {
	console.error('❌ Failed to set up avatar storage:', error.message);
	process.exit(1);
}