'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/database/factory';

export function DatabaseAdapterBadge() {
	const [adapterType, setAdapterType] = useState<string>('Loading...');
	const [flagValue, setFlagValue] = useState<string>('Loading...');

	useEffect(() => {
		// Get the actual adapter type safely
		const adapterName = db?.constructor?.name ?? 'Unknown';
		setAdapterType(adapterName);
		setFlagValue('supabase');
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
