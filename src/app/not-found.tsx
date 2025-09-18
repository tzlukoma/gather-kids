'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Home,
	ArrowLeft,
	Search,
	HelpCircle,
	Mail,
	Users,
	BookOpen,
} from 'lucide-react';
import { useBranding } from '@/contexts/branding-context';

export default function NotFound() {
	const { settings } = useBranding();

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<div className="max-w-2xl w-full">
				<Card className="shadow-xl border border-border bg-card">
					<CardHeader className="text-center pb-8">
						{/* Brand Logo/Name */}
						<div className="flex items-center justify-center mb-6">
							{settings.logo_url ? (
								<>
									<img
										src={settings.logo_url}
										alt={`${settings.app_name || 'gatherKids'} Logo`}
										className={`h-16 w-auto ${
											settings.use_logo_only ? '' : 'max-w-[50%]'
										} object-contain`}
									/>
									{!settings.use_logo_only && (
										<div className="font-headline text-2xl font-bold text-foreground ml-2">
											{settings.app_name || 'gatherKids'}
										</div>
									)}
								</>
							) : (
								<div className="font-headline text-2xl font-bold text-foreground">
									{settings.app_name || 'gatherKids'}
								</div>
							)}
						</div>

						{/* 404 Icon */}
						<div className="mx-auto mb-6 w-24 h-24 bg-gradient-to-br from-brand-teal to-brand-aqua rounded-full flex items-center justify-center">
							<Search className="w-12 h-12 text-white" />
						</div>

						<CardTitle className="text-4xl font-bold font-headline text-foreground mb-2">
							Page Not Found
						</CardTitle>
						<CardDescription className="text-lg text-muted-foreground">
							Sorry, we couldn't find the page you're looking for.
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-8">
						{/* Error Code */}
						<div className="text-center">
							<div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4">
								<span className="text-2xl font-bold font-headline text-muted-foreground">
									404
								</span>
							</div>
						</div>

						{/* Helpful Information */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold font-headline text-foreground text-center">
								What can you do?
							</h3>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="p-4 bg-brand-teal/10 rounded-lg border border-brand-teal/20">
									<div className="flex items-start space-x-3">
										<Home className="w-5 h-5 text-brand-teal mt-0.5 flex-shrink-0" />
										<div>
											<h4 className="font-medium font-headline text-foreground">
												Go Home
											</h4>
											<p className="text-sm text-muted-foreground mt-1">
												Return to the main dashboard to find what you need.
											</p>
										</div>
									</div>
								</div>

								<div className="p-4 bg-brand-aqua/10 rounded-lg border border-brand-aqua/20">
									<div className="flex items-start space-x-3">
										<ArrowLeft className="w-5 h-5 text-brand-aqua mt-0.5 flex-shrink-0" />
										<div>
											<h4 className="font-medium font-headline text-foreground">
												Go Back
											</h4>
											<p className="text-sm text-muted-foreground mt-1">
												Use your browser's back button to return to the previous
												page.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Common Links */}
						<div className="space-y-4">
							<h3 className="text-lg font-semibold font-headline text-foreground text-center">
								Popular Pages
							</h3>

							<div className="grid gap-2 md:grid-cols-2">
								<Link href="/dashboard">
									<Button variant="outline" className="w-full justify-start">
										<Home className="w-4 h-4 mr-2" />
										Dashboard
									</Button>
								</Link>

								<Link href="/dashboard/check-in">
									<Button variant="outline" className="w-full justify-start">
										<Users className="w-4 h-4 mr-2" />
										Check-In
									</Button>
								</Link>

								<Link href="/dashboard/registrations">
									<Button variant="outline" className="w-full justify-start">
										<HelpCircle className="w-4 h-4 mr-2" />
										Registrations
									</Button>
								</Link>

								<Link href="/dashboard/bible-bee">
									<Button variant="outline" className="w-full justify-start">
										<BookOpen className="w-4 h-4 mr-2" />
										Bible Bee
									</Button>
								</Link>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<Link href="/dashboard" className="flex-1">
								<Button className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white">
									<Home className="w-4 h-4 mr-2" />
									Go to Dashboard
								</Button>
							</Link>

							<Button
								variant="outline"
								onClick={() => window.history.back()}
								className="flex-1">
								<ArrowLeft className="w-4 h-4 mr-2" />
								Go Back
							</Button>
						</div>

						{/* Support Information */}
						<div className="pt-6 border-t border-border">
							<div className="text-center space-y-2">
								<p className="text-sm text-muted-foreground">
									Still having trouble? We're here to help!
								</p>
								<div className="flex justify-center space-x-4">
									<Link
										href="mailto:gatherkids.mtah@gmail.com"
										className="inline-flex items-center text-sm text-brand-teal hover:text-brand-teal/80 transition-colors">
										<Mail className="w-4 h-4 mr-1" />
										Contact Support
									</Link>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
