#!/usr/bin/env node

/**
 * Script to validate database configuration from the environment
 *
 * Usage:
 *   node scripts/debug/validate-db-config.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// First check if .env.local exists
const envLocalPath = path.join(projectRoot, '.env.local');
const envUatPath = path.join(projectRoot, '.env.uat');
const envLocalExists = fs.existsSync(envLocalPath);
const envUatExists = fs.existsSync(envUatPath);

// Colors for output
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
};

// Load environment variables from .env.local or .env.uat
if (envLocalExists) {
	console.log(
		`${colors.cyan}🔍 Loading configuration from .env.local${colors.reset}`
	);
	dotenv.config({ path: envLocalPath });
} else if (envUatExists) {
	console.log(
		`${colors.cyan}🔍 Loading configuration from .env.uat${colors.reset}`
	);
	dotenv.config({ path: envUatPath });
} else {
	console.log(
		`${colors.yellow}⚠️ No environment file found (.env.local or .env.uat)${colors.reset}`
	);
}

// Database mode is always Supabase (demo mode removed)
console.log(`\n${colors.blue}🔄 Database Mode:${colors.reset} supabase (always)`);

// Check Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`\n${colors.blue}📝 Supabase Configuration:${colors.reset}`);
if (supabaseUrl) {
	console.log(
		`${colors.green}✅ NEXT_PUBLIC_SUPABASE_URL:${colors.reset} ${supabaseUrl}`
	);
} else {
	console.log(
		`${colors.red}❌ NEXT_PUBLIC_SUPABASE_URL:${colors.reset} Not set`
	);
}

if (supabaseKey) {
	// Only show first few characters for security
	const maskedKey =
		supabaseKey.substring(0, 6) +
		'...' +
		supabaseKey.substring(supabaseKey.length - 4);
	console.log(
		`${colors.green}✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:${colors.reset} ${maskedKey}`
	);
} else {
	console.log(
		`${colors.red}❌ NEXT_PUBLIC_SUPABASE_ANON_KEY:${colors.reset} Not set`
	);
}

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
console.log(
	`\n${colors.blue}📊 Database Adapter:${colors.reset} ${
		hasSupabaseConfig
			? colors.green + 'SupabaseAdapter'
			: colors.red + 'error (missing Supabase env)'
	}${colors.reset}`
);

// Check Bible Bee ministry
console.log(`\n${colors.blue}🔍 Bible Bee Configuration:${colors.reset}`);
const MINISTRY_ID = 'bible-bee';
console.log(`${colors.white}Ministry ID:${colors.reset} ${MINISTRY_ID}`);

// Final diagnostic message
if (hasSupabaseConfig) {
	console.log(
		`\n${colors.green}✅ Your application is configured to use Supabase for database operations${colors.reset}`
	);
	console.log(
		`${colors.cyan}👉 If Bible Bee data isn't showing, check:${colors.reset}`
	);
	console.log(`   1. The data exists in your Supabase database`);
	console.log(`   2. Your code is using dbAdapter methods`);
	console.log(`   3. You have proper permissions to access the data`);
	console.log(
		`\n${colors.cyan}📚 See docs/DATABASE_ADAPTERS.md for more information.${colors.reset}`
	);
} else {
	console.log(
		`\n${colors.red}❌ Database mode is always Supabase, but configuration is incomplete${colors.reset}`
	);
	console.log(
		`   Missing: ${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : ''}${
			!supabaseUrl && !supabaseKey ? ', ' : ''
		}${!supabaseKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`
	);
}
