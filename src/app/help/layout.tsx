import type { Metadata } from 'next';
import { HelpShell } from './help-shell';
import { HELP_SIDEBAR } from '@/lib/help/sidebar';
import { getAppVersion } from '@/lib/help/app-version';

export const metadata: Metadata = {
	title: 'User guide · gatherKids',
	description: 'How families and ministry leaders use gatherKids.',
};

export default function HelpLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<HelpShell sidebar={HELP_SIDEBAR} appVersion={getAppVersion()}>
			{children}
		</HelpShell>
	);
}
