import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { FeatureFlagProvider } from '@/contexts/feature-flag-context';
import { BrandingProvider } from '@/contexts/branding-context';
import { ReactQueryProvider } from '@/lib/queryClient';
import VercelAnalytics from '@/components/VercelAnalytics';
import { DynamicMetadata } from '@/components/DynamicMetadata';

export const metadata: Metadata = {
	title: 'gatherKids',
	description: "gatherKids - Children's Ministry Management",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body className="font-body antialiased" suppressHydrationWarning>
				<FeatureFlagProvider>
					<BrandingProvider>
						<DynamicMetadata />
						<AuthProvider>
							<ReactQueryProvider>{children}</ReactQueryProvider>
						</AuthProvider>
					</BrandingProvider>
				</FeatureFlagProvider>
				<Toaster />
				{process.env.NODE_ENV === 'production' && <VercelAnalytics />}
			</body>
		</html>
	);
}
