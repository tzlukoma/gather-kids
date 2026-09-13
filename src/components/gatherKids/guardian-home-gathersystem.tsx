'use client';

import type { HouseholdProfileData } from '@/lib/dal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, BookOpen, Home, Calendar } from 'lucide-react';
import Link from 'next/link';
import { normalizeGradeDisplay } from '@/lib/gradeUtils';

interface GuardianHomeGatherSystemProps {
	profileData: HouseholdProfileData;
}

export function GuardianHomeGatherSystem({
	profileData,
}: GuardianHomeGatherSystemProps) {
	const { household, children } = profileData;
	const activeChildren = children.filter((c) => c.is_active);

	// Filter children enrolled in Bible Bee
	const bibleBeeChildren = activeChildren.filter((child) =>
		Object.values(child.enrollmentsByCycle).some((enrollments: any) =>
			enrollments.some(
				(enrollment: any) => enrollment.ministry_code === 'bible-bee'
			)
		)
	);

	const hasBibleBee = bibleBeeChildren.length > 0;

	return (
		<div className="min-h-screen bg-ground">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-headline font-semibold text-ink mb-2">
						{household?.name}
					</h1>
					<p className="text-muted-foreground">
						Welcome back! Here&apos;s what&apos;s happening with your family.
					</p>
				</div>

				{/* Quick Actions */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
					<Card className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<CardTitle className="font-headline text-lg flex items-center gap-2">
								<Home className="h-5 w-5 text-teal" />
								Household Profile
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								View and manage your household information
							</p>
							<Button variant="default" className="w-full" asChild>
								<Link href="/household/profile">View Profile</Link>
							</Button>
						</CardContent>
					</Card>

					{hasBibleBee && (
						<Card className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-3">
								<CardTitle className="font-headline text-lg flex items-center gap-2">
									<BookOpen className="h-5 w-5 text-teal" />
									Bible Bee
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground mb-4">
									Track scripture memory and essay progress
								</p>
								<Button variant="default" className="w-full" asChild>
									<Link href="/household/bible-bee">View Scriptures</Link>
								</Button>
							</CardContent>
						</Card>
					)}

					<Card className="hover:shadow-md transition-shadow">
						<CardHeader className="pb-3">
							<CardTitle className="font-headline text-lg flex items-center gap-2">
								<Calendar className="h-5 w-5 text-teal" />
								Events
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								Upcoming ministry events and activities
							</p>
							<Button variant="outline" className="w-full" disabled>
								Coming Soon
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Children Overview */}
				<div className="mb-8">
					<h2 className="text-2xl font-headline font-semibold text-ink mb-4">
						Your Children
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{activeChildren.map((child) => {
							const isBibleBee = bibleBeeChildren.some(
								(c) => c.child_id === child.child_id
							);
							return (
								<Card key={child.child_id} className="hover:shadow-md transition-shadow">
									<CardHeader>
										<div className="flex items-center gap-4">
											<Avatar className="h-16 w-16">
												<AvatarImage src={child.photo_url} alt={child.first_name} />
												<AvatarFallback>
													<User className="h-8 w-8" />
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<CardTitle className="font-headline text-lg">
													{child.first_name} {child.last_name}
												</CardTitle>
												<p className="text-sm text-muted-foreground">
													{normalizeGradeDisplay(child.grade)} • Age {child.age}
												</p>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										{isBibleBee && (
											<Button
												variant="default"
												size="sm"
												className="w-full mb-2"
												asChild>
												<Link href={`/household/children/${child.child_id}/bible-bee`}>
													<BookOpen className="h-4 w-4 mr-2" />
													Bible Bee Progress
												</Link>
											</Button>
										)}
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
