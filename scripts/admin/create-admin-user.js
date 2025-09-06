#!/usr/bin/env node
/**
 * Create Admin User for gatherKids
 *
 * This script creates an admin user in the Supabase Auth system and adds the corresponding
 * record in the users table with the ADMIN role. Uses the Supabase Admin API which requires
 * the service role key.
 *
 * Usage:
 *   node scripts/admin/create-admin-user.js <email> <password>
 *
 * Example:
 *   node scripts/admin/create-admin-user.js admin@example.com StrongPassword123!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('Error: Missing required environment variables:');
	if (!supabaseUrl) console.error('- NEXT_PUBLIC_SUPABASE_URL');
	if (!serviceRoleKey) console.error('- SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

// Get command line arguments
const [email, password] = process.argv.slice(2);

if (!email || !password) {
	console.error(
		'Usage: node scripts/admin/create-admin-user.js <email> <password>'
	);
	process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
	console.error('Error: Invalid email format');
	process.exit(1);
}

// Validate password strength
if (password.length < 8) {
	console.error('Error: Password must be at least 8 characters long');
	process.exit(1);
}

async function createAdminUser() {
	try {
		// Initialize Supabase client with service role key
		const supabase = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});

		console.log(`Creating admin user with email: ${email}`);

		// Step 1: Create the user in Supabase Auth
		const { data: authData, error: authError } =
			await supabase.auth.admin.createUser({
				email,
				password,
				email_confirm: true, // Auto-confirm the email
				user_metadata: {
					role: 'ADMIN',
					full_name: 'Administrator',
				},
			});

		if (authError) {
			console.error('Error creating auth user:', authError);
			process.exit(1);
		}

		if (!authData.user) {
			console.error('Error: User creation succeeded but no user data returned');
			process.exit(1);
		}

		console.log(`✅ Auth user created with ID: ${authData.user.id}`);

		// Step 2: Add the user to the public.users table with ADMIN role
		const { error: dbError } = await supabase.from('users').upsert({
			user_id: authData.user.id,
			name: 'Administrator',
			email: email,
			role: 'ADMIN',
			is_active: true,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		if (dbError) {
			console.error('Error adding user to users table:', dbError);
			console.error('Auth user was created, but database record failed');
			console.error(
				'You may need to manually add a record to the "users" table'
			);
			process.exit(1);
		}

		console.log(`✅ User added to users table with ADMIN role`);
		console.log(`✅ Admin user creation complete!`);
		console.log(`\nYou can now log in with:`);
		console.log(`Email: ${email}`);
		console.log(`Password: [your password]`);
	} catch (error) {
		console.error('Unexpected error:', error);
		process.exit(1);
	}
}

createAdminUser();
