'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
// db import unused in this debugger; rely on adapter helpers instead
import { dbAdapter, isSupabase, getDatabaseMode } from '@/lib/db-utils';
import { getFlag } from '@/lib/featureFlags';
import { getBibleBeeYears } from '@/lib/dal';

export default function BibleBeeDebugger() {
	const { user } = useAuth();

	function getUserId(u: unknown) {
		const user = u as { uid?: string; id?: string; user_id?: string } | null;
		return user?.uid || user?.id || user?.user_id || null;
	}

	useEffect(() => {
		console.group('🔍 Bible Bee Debug Information');

		// Check database mode
		console.log('📊 Database Configuration:');
		console.log('- DATABASE_MODE flag:', getFlag('DATABASE_MODE'));
		console.log('- Detected Mode:', getDatabaseMode());
		console.log('- Using Supabase:', isSupabase() ? '✅ Yes' : '❌ No');
		console.log(
			'- DB Adapter Type:',
			dbAdapter?.constructor?.name || 'unknown'
		);

		// Check auth status
		console.log('👤 Auth Status:');
		console.log('- User logged in:', user ? '✅ Yes' : '❌ No');
		if (user) {
			console.log('- User ID:', getUserId(user));
			console.log('- User Role:', user?.metadata?.role);
			console.log('- Assigned Ministries:', user?.assignedMinistryIds);
		}

		// Check localStorage
		console.log('🔐 Local Storage:');
		console.log(
			'- gatherkids-user:',
			localStorage.getItem('gatherkids-user') ? '✅ Present' : '❌ Missing'
		);

		// Check for Supabase tokens
		const supabaseTokens = Object.keys(localStorage).filter((key) =>
			key.startsWith('sb-')
		);
		console.log(
			'- Supabase tokens:',
			supabaseTokens.length > 0 ? '✅ Present' : '❌ Missing'
		);

		// Check Bible Bee data availability using DAL function
		console.log('📚 Bible Bee Data Check:');
		getBibleBeeYears()
			.then((years) => {
				console.log(`- Bible Bee Years/Cycles in DB: ${years.length}`);
				if (years.length > 0) {
					console.log(
						'  - Available cycles:',
						years.map((y) => y.name || y.label || y.id)
					);
				}
			})
			.catch((err) => {
				console.error('Error fetching Bible Bee years:', err);
			});

		dbAdapter.listMinistries().then((ministries) => {
			const bibleBee = ministries.find(
				(m) =>
					m.name?.toLowerCase().includes('bible bee') ||
					m.code?.toLowerCase().includes('bible-bee') ||
					(m.ministry_id && m.ministry_id.toLowerCase().includes('bible_bee'))
			);
			console.log(
				'- Bible Bee Ministry:',
				bibleBee ? '✅ Found' : '❌ Not Found'
			);
			if (bibleBee) {
				console.log('  - ID:', bibleBee.ministry_id);
				console.log('  - Name:', bibleBee.name);
				console.log('  - Code:', bibleBee.code);
			}
		});

		console.groupEnd();
	}, [user]);

	// This component doesn't render anything visible
	return null;
}
