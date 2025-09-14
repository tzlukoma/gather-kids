#!/usr/bin/env node

/**
 * Auth Users and Roles Checker
 *
 * This script checks all auth users in Supabase and displays their roles,
 * email confirmation status, and other relevant information.
 *
 * Usage:
 *   node scripts/check-auth-users.js
 *
 * Environment Variables Required:
 *   - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	console.error('   NEXT_PUBLIC_SUPABASE_URL');
	console.error('   SUPABASE_SERVICE_ROLE_KEY');
	console.error('');
	console.error('Make sure these are set in your .env.local file');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthUsers() {
	console.log('🔍 Checking auth users and roles...');
	console.log('📡 Connecting to:', supabaseUrl);
	console.log('');

	try {
		// Get all auth users
		const { data, error } = await supabase.auth.admin.listUsers();

		if (error) {
			console.error('❌ Error fetching users:', error.message);
			process.exit(1);
		}

		const users = data.users.map((user) => ({
			id: user.id,
			email: user.email,
			role: user.user_metadata?.role || 'GUEST',
			name: user.user_metadata?.full_name || user.email,
			email_confirmed: !!user.email_confirmed_at,
			last_sign_in: user.last_sign_in_at,
			created_at: user.created_at,
			user_metadata: user.user_metadata,
		}));

		console.log(`📊 Found ${users.length} auth users:`);
		console.log('');

		// Group users by role
		const usersByRole = users.reduce((acc, user) => {
			const role = user.role;
			if (!acc[role]) acc[role] = [];
			acc[role].push(user);
			return acc;
		}, {});

		// Display users grouped by role
		Object.entries(usersByRole).forEach(([role, roleUsers]) => {
			console.log(`👥 ${role} (${roleUsers.length} users):`);
			roleUsers.forEach((user) => {
				const status = user.email_confirmed ? '✅' : '⚠️';
				const lastSignIn = user.last_sign_in
					? new Date(user.last_sign_in).toLocaleDateString()
					: 'Never';
				console.log(
					`   ${status} ${user.name} (${user.email}) - Last sign in: ${lastSignIn}`
				);
			});
			console.log('');
		});

		// Summary statistics
		console.log('📈 Summary:');
		console.log(`   Total users: ${users.length}`);
		console.log(
			`   Confirmed emails: ${users.filter((u) => u.email_confirmed).length}`
		);
		console.log(
			`   Unconfirmed emails: ${users.filter((u) => !u.email_confirmed).length}`
		);
		console.log(`   Active roles: ${Object.keys(usersByRole).join(', ')}`);

		// Check for potential issues
		console.log('');
		console.log('🔍 Health Checks:');

		const unconfirmedUsers = users.filter((u) => !u.email_confirmed);
		if (unconfirmedUsers.length > 0) {
			console.log(
				`   ⚠️  ${unconfirmedUsers.length} users with unconfirmed emails:`
			);
			unconfirmedUsers.forEach((user) => {
				console.log(`      - ${user.email}`);
			});
		} else {
			console.log('   ✅ All users have confirmed emails');
		}

		const usersWithoutRoles = users.filter((u) => !u.user_metadata?.role);
		if (usersWithoutRoles.length > 0) {
			console.log(
				`   ⚠️  ${usersWithoutRoles.length} users without explicit roles (defaulting to GUEST):`
			);
			usersWithoutRoles.forEach((user) => {
				console.log(`      - ${user.email}`);
			});
		} else {
			console.log('   ✅ All users have explicit roles');
		}

		// Check for inactive users (no sign-in in last 90 days)
		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		const inactiveUsers = users.filter((user) => {
			if (!user.last_sign_in) return true;
			return new Date(user.last_sign_in) < ninetyDaysAgo;
		});

		if (inactiveUsers.length > 0) {
			console.log(
				`   ⚠️  ${inactiveUsers.length} users inactive for 90+ days:`
			);
			inactiveUsers.forEach((user) => {
				const lastSignIn = user.last_sign_in
					? new Date(user.last_sign_in).toLocaleDateString()
					: 'Never';
				console.log(`      - ${user.email} (last sign in: ${lastSignIn})`);
			});
		} else {
			console.log('   ✅ All users have been active within 90 days');
		}

		console.log('');
		console.log('✅ Auth users check completed successfully!');
	} catch (error) {
		console.error('❌ Unexpected error:', error.message);
		process.exit(1);
	}
}

// Run the check
checkAuthUsers();
