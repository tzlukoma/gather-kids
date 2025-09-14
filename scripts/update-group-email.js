#!/usr/bin/env node
/**
 * Quick script to add email address to existing ministry group
 * Usage: node scripts/update-group-email.js
 */

import { createClient } from '@supabase/supabase-js';

// Environment setup
const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_UAT_URL;
const serviceRoleKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_UAT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('Missing required environment variables:');
	console.error('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_UAT_URL');
	console.error('- SUPABASE_SERVICE_ROLE_KEY or SUPABASE_UAT_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false },
});

async function updateGroupEmail() {
	try {
		console.log('📧 Updating ministry group email...');

		// Determine email based on environment
		const email = supabaseUrl.includes('uat')
			? 'choirs@example.com'
			: 'choirs@morethanahut.com';

		const { data, error } = await supabase
			.from('ministry_groups')
			.update({ email })
			.eq('code', 'choirs')
			.select();

		if (error) {
			throw new Error(`Failed to update ministry group: ${error.message}`);
		}

		if (data && data.length > 0) {
			console.log(`✅ Updated ministry group email to: ${email}`);
			console.log('Updated group:', data[0]);
		} else {
			console.log('⚠️ No ministry group found with code "choirs"');
		}
	} catch (error) {
		console.error('❌ Error updating ministry group email:', error.message);
		process.exit(1);
	}
}

updateGroupEmail();
