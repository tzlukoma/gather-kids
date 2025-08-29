#!/usr/bin/env node
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url =
	process.env.SUPABASE_URL ??
	process.env.NEXT_PUBLIC_SUPABASE_URL ??
	'http://localhost:54321';
const serviceKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ??
	(fs.existsSync(process.env.HOME + '/.supabase/local-service-role-key')
		? fs
				.readFileSync(
					process.env.HOME + '/.supabase/local-service-role-key',
					'utf8'
				)
				.trim()
		: undefined);

if (!serviceKey) {
	console.error(
		'Service role key not found. Set SUPABASE_SERVICE_ROLE_KEY or ensure ~/.supabase/local-service-role-key exists'
	);
	process.exit(1);
}

const supabase = createClient(url, serviceKey, {
	auth: { persistSession: false },
});

async function main() {
	const scriptures = JSON.parse(
		fs.readFileSync(new URL('./scriptures.json', import.meta.url))
	);
	// Use .select() to force returned rows and log the full response for debugging
	const res = await supabase.from('scriptures').upsert(scriptures).select('*');
	// res has shape: { data, error }
	console.log('Supabase response:', JSON.stringify(res, null, 2));
	const { data, error } = res;
	if (error) {
		console.error('Seed error:', error);
		process.exit(1);
	}
	console.log('Seed complete. Inserted/updated rows:', data?.length ?? 0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
