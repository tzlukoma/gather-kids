'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/database/factory';

export function DatabaseAdapterBadge() {
	const [adapterType] = useState<string>(() => db?.constructor?.name ?? 'Unknown');
	const [flagValue] = useState<string>('supabase');

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
