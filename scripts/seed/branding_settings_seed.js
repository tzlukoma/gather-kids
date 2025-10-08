#!/usr/bin/env node

/**
 * Seed script for branding settings
 * Creates default branding settings for the application
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing Supabase environment variables');
	console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
	console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey);
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedBrandingSettings() {
	console.log('🌱 Seeding branding settings...');

	try {
		// Check if branding settings already exist
		const { data: existingSettings, error: checkError } = await supabase
			.from('branding_settings')
			.select('*')
			.eq('org_id', 'default');

		if (checkError) {
			console.error('Error checking existing branding settings:', checkError);
			throw checkError;
		}

		if (existingSettings && existingSettings.length > 0) {
			console.log('✅ Branding settings already exist for org_id: default');
			console.log('Existing settings:', existingSettings[0]);
			return;
		}

		// Create default branding settings
		const defaultSettings = {
			setting_id: uuidv4(),
			org_id: 'default',
			app_name: 'gatherKids',
			description:
				"The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
			logo_url: null,
			use_logo_only: false,
			youtube_url: null,
			instagram_url: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		console.log('Creating default branding settings:', defaultSettings);

		const { data, error } = await supabase
			.from('branding_settings')
			.insert([defaultSettings])
			.select();

		if (error) {
			console.error('Error creating branding settings:', error);
			throw error;
		}

		console.log('✅ Successfully created branding settings:', data[0]);
	} catch (error) {
		console.error('❌ Failed to seed branding settings:', error);
		process.exit(1);
	}
}

async function main() {
	console.log('🚀 Starting branding settings seed...');
	console.log('Environment:', process.env.NODE_ENV || 'development');
	console.log('Supabase URL:', supabaseUrl);

	await seedBrandingSettings();

	console.log('🎉 Branding settings seed completed successfully!');
}

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export { seedBrandingSettings };
