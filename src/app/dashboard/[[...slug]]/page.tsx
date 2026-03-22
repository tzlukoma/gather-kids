import { redirect } from 'next/navigation';

interface Props {
	params: Promise<{ slug?: string[] }>;
}

/**
 * Catch-all redirect for legacy /dashboard/* routes.
 * Strips the /dashboard prefix and redirects to the new flat URL.
 * e.g. /dashboard/check-in → /check-in
 *      /dashboard → /check-in (default admin landing page)
 */
export default async function DashboardCatchAll({ params }: Props) {
	const { slug } = await params;
	if (!slug || slug.length === 0) {
		redirect('/check-in');
	}
	const newPath = '/' + slug.join('/');
	redirect(newPath);
}
