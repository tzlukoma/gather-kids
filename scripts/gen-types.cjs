#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directory setup
const TYPES_DIR = path.join(process.cwd(), 'src', 'lib', 'database');
if (!fs.existsSync(TYPES_DIR)) {
	fs.mkdirSync(TYPES_DIR, { recursive: true });
}

const TYPES_FILE = path.join(TYPES_DIR, 'supabase-types.ts');
const HEADER = `/**
 * This file contains types generated from the Supabase schema.
 * DO NOT EDIT MANUALLY. This file is auto-generated.
 * Generated on: ${new Date().toISOString()}
 */

`;

// Parse command-line arguments
const args = process.argv.slice(2);
const useLocal = args.includes('--local');
const projectId = process.env.SUPABASE_PROJECT_ID;

// Check if Supabase CLI is available
function isSupabaseCLIAvailable() {
	// If caller provided explicit SUPABASE_CLI, prefer that
	if (process.env.SUPABASE_CLI) {
		try {
			execSync(`${process.env.SUPABASE_CLI} --version`, { stdio: 'ignore' });
			return { type: 'explicit', path: process.env.SUPABASE_CLI };
		} catch (err) {
			console.warn(
				`Supplied SUPABASE_CLI (${process.env.SUPABASE_CLI}) is not executable or not found.`
			);
		}
	}

	// First try the bin directory where some workflows install it
	try {
		const binPath = `${process.env.HOME}/.bin/supabase`;
		execSync(`${binPath} --version`, { stdio: 'ignore' });
		return { type: 'bin', path: binPath };
	} catch (error) {
		// Try the global command
		try {
			execSync('supabase --version', { stdio: 'ignore' });
			return { type: 'global', path: 'supabase' };
		} catch (error2) {
			return false;
		}
	}
}

// Create a fallback types file if CLI is not available
function createFallbackTypes() {
	const fallbackTypes =
		HEADER +
		`// Supabase CLI not available - using fallback types
// Install Supabase CLI to generate actual types from schema

export interface Database {
	public: {
		Tables: {
			[key: string]: {
				Row: any;
				Insert: any;
				Update: any;
				Relationships: any[];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
}

export type SupabaseJson = any;
`;

	fs.writeFileSync(TYPES_FILE, fallbackTypes);
	console.log(
		`⚠️  Supabase CLI not available. Created fallback types: ${TYPES_FILE}`
	);
	console.log('📖 To generate actual types, install Supabase CLI:');
	console.log(
		'   - Using Docker: curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh'
	);
	console.log(
		'   - Or download from: https://github.com/supabase/cli/releases'
	);
}

function main() {
	try {
		// Check if Supabase CLI is available
		const cliLocation = isSupabaseCLIAvailable();
		if (!cliLocation) {
			createFallbackTypes();
			return;
		}

		// Use the correct path to the Supabase CLI and log it for determinism
		const supabasePath = cliLocation.path;
		console.log(
			`🔎 Using Supabase CLI at: ${supabasePath} (detected: ${cliLocation.type})`
		);

		let command;
		if (useLocal) {
			console.log('📦 Generating types from local Supabase instance...');
			// Must specify --local flag when using local generation
			// This is required by the CLI (--schema is an additional option)
			command = `${supabasePath} gen types typescript --local --schema public`;
		} else if (projectId) {
			console.log(
				`📦 Generating types from remote Supabase project (${projectId})...`
			);
			command = `${supabasePath} gen types typescript --project-id "${projectId}" --schema public`;
		} else {
			console.error(
				'❌ No project ID provided and --local not specified. Set SUPABASE_PROJECT_ID or use --local flag.'
			);
			process.exit(1);
		}

		// Execute type generation
		console.log(`▶️  Executing: ${command}`);
		const types = execSync(command, {
			stdio: ['ignore', 'pipe', 'pipe'],
		}).toString();

		// Post-process the types
		const processedTypes =
			HEADER +
			types
				// Add any custom processing here if needed
				.replace(/export type Json/, 'export type SupabaseJson');
		// Add more replacements as needed

		fs.writeFileSync(TYPES_FILE, processedTypes);
		console.log(`✅ Types generated successfully: ${TYPES_FILE}`);
	} catch (error) {
		console.error('❌ Failed to generate types:', error.message);

		// Create fallback types on error
		console.log('📦 Creating fallback types...');
		createFallbackTypes();
	}
}

// Run the main function
main();
