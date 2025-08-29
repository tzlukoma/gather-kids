import React from 'react';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function Page() {
	const { data, error } = await supabaseAdmin
		.from('scriptures')
		.select('id, reference, texts, created_at')
		.order('order', { ascending: true });

	if (error) return <pre>DB error: {String(error.message)}</pre>;

	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold">Seeded Scriptures</h1>
			<ul className="mt-4 space-y-4">
				{(data ?? []).map((s: any) => (
					<li key={s.id} className="border p-3 rounded">
						<div className="text-lg font-semibold">{s.reference}</div>
						<div className="text-sm text-gray-500">{s.created_at}</div>
						<div
							className="mt-2"
							dangerouslySetInnerHTML={{ __html: s.texts?.niv ?? '' }}
						/>
					</li>
				))}
			</ul>
		</div>
	);
}
