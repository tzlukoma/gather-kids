'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/database/factory';
import { getFlag } from '@/lib/featureFlags';

export function DatabaseAdapterBadge() {
	const [adapterType, setAdapterType] = useState<string>('Loading...');
	const [flagValue, setFlagValue] = useState<string>('Loading...');

	useEffect(() => {
		// Get the actual adapter type
		const adapter = (db as any).constructor.name;
		setAdapterType(adapter);

		// Get the database mode from feature flag
		const flagMode = getFlag('DATABASE_MODE');
		const mode = adapter.includes('Supabase') ? 'supabase' : 'indexeddb';
		setFlagValue(`${mode} (flag: ${flagMode || 'default'})`);
	}, []);

	const color = adapterType.includes('Supabase')
		? 'bg-green-500'
		: 'bg-blue-500';

	return (
		<Badge
			className={`${color} text-white`}
			title={`Database Mode: ${flagValue}`}>
			{adapterType}
		</Badge>
	);
}
