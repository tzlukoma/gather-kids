import type { Metadata } from 'next';
import { Work_Sans, Merriweather } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { FeatureFlagProvider } from '@/contexts/feature-flag-context';
import { BrandingProvider } from '@/contexts/branding-context';
import { ReactQueryProvider } from '@/lib/queryClient';
import VercelAnalytics from '@/components/VercelAnalytics';
import { DynamicMetadata } from '@/components/DynamicMetadata';
import { AuthDebug } from '@/components/auth/auth-debug';
import { DebugInstaller } from '@/lib/debug/debug-installer';
import { DebugPanelDialog } from '@/components/debug/debug-panel-dialog';

// PERF-09: Use next/font for optimized font loading (eliminates render-blocking Google Fonts requests)
const workSans = Work_Sans({
	subsets: ['latin'],
	weight: ['300', '400', '600', '700'],
	variable: '--font-work-sans',
	display: 'swap',
});

const merriweather = Merriweather({
	subsets: ['latin'],
	weight: ['300', '400', '700'],
	variable: '--font-merriweather',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'gatherKids',
	description: 'gatherKids - Children&apos;s Ministry Management',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${workSans.variable} ${merriweather.variable}`}>
			<body className="font-body antialiased" suppressHydrationWarning>
				<FeatureFlagProvider>
					<BrandingProvider>
						<DynamicMetadata />
						<AuthProvider>
							<ReactQueryProvider>{children}</ReactQueryProvider>
							{process.env.NODE_ENV !== 'production' && <AuthDebug />}
							<DebugInstaller />
							<DebugPanelDialog />
						</AuthProvider>
					</BrandingProvider>
				</FeatureFlagProvider>
				<Toaster />
				{process.env.NODE_ENV === 'production' && <VercelAnalytics />}
			</body>
		</html>
	);
}
