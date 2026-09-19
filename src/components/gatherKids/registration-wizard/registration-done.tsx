'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, MapPin } from 'lucide-react';
import type { RegisteredChildReceipt } from '@/lib/types';

interface RegistrationDoneProps {
	childrenEnrolledInBibleBee?: boolean;
	/**
	 * What registration actually persisted, straight from the DAL.
	 *
	 * This used to be assembled from the submitted form, so it announced
	 * ministries the DAL had declined to enrol the child in (#400). It is the
	 * receipt now: if it is not here, it was not stored.
	 */
	registeredChildren?: RegisteredChildReceipt[];
}

export function RegistrationDone({
	childrenEnrolledInBibleBee = false,
	registeredChildren = [],
}: RegistrationDoneProps) {
	const router = useRouter();

	// Calculate next Sunday
	const getNextSunday = () => {
		const today = new Date();
		const dayOfWeek = today.getDay();
		const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
		const nextSunday = new Date(today);
		nextSunday.setDate(today.getDate() + daysUntilSunday);
		return nextSunday.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<div className="flex flex-1 items-center justify-center bg-[#f7f5f1] px-4 py-8">
			<div className="max-w-2xl w-full space-y-6">
				{/* Success Header */}
				<div className="text-center">
					<div className="flex justify-center mb-4">
						<div className="bg-[#017c7d] rounded-full p-4">
							<CheckCircle2 className="h-16 w-16 text-white" />
						</div>
					</div>
					<h1 className="text-3xl font-bold text-[#1e2a2f] mb-2">
						You&apos;re registered!
					</h1>
					<p className="text-[#5b6b72]">
						Your family&apos;s registration has been confirmed.
					</p>
				</div>

				{/* Confirmed Summary */}
				{registeredChildren.length > 0 && (
					<Card className="border-[#eae4da] shadow-xs">
						<CardContent className="p-6">
							<div className="flex items-center gap-2 mb-4">
								<CheckCircle2 className="h-5 w-5 text-[#017c7d]" />
								<h2 className="text-lg font-semibold text-[#1e2a2f]">
									Confirmed Registration
								</h2>
							</div>
							<div className="space-y-4">
								{registeredChildren.map((child) => {
									const enrolled = child.enrollments.filter(
										(e) => e.status === 'enrolled'
									);
									const interested = child.enrollments.filter(
										(e) => e.status === 'expressed_interest'
									);

									return (
										<div
											key={child.child_id}
											className="pb-4 border-b border-[#eae4da] last:border-0 last:pb-0">
											<p className="font-semibold text-[#1e2a2f] mb-2">
												{`${child.first_name} ${child.last_name}`.trim()}
											</p>
											<div className="space-y-1">
												{enrolled.map((enrollment) => (
													<div
														key={enrollment.ministry_id}
														className="flex items-center gap-2 text-sm text-[#5b6b72]">
														<div className="h-1.5 w-1.5 rounded-full bg-[#017c7d]" />
														<span>{enrollment.ministry_name}</span>
													</div>
												))}
											</div>

											{/* Interest is a request to be contacted, not a place in the
											    ministry, so it is never listed beside the enrollments. */}
											{interested.length > 0 && (
												<div className="mt-3">
													<p className="text-xs font-medium uppercase tracking-wide text-[#8a7f6d]">
														Interest noted — not yet registered
													</p>
													<div className="mt-1 space-y-1">
														{interested.map((enrollment) => (
															<div
																key={enrollment.ministry_id}
																className="flex items-center gap-2 text-sm text-[#5b6b72]">
																<div className="h-1.5 w-1.5 rounded-full border border-[#8a7f6d]" />
																<span>{enrollment.ministry_name}</span>
															</div>
														))}
													</div>
													<p className="mt-1 text-xs text-[#5b6b72]">
														Someone will be in touch about these.
													</p>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</CardContent>
					</Card>
				)}

				{/* This Sunday Card */}
				<Card className="border-[#017c7d] border-2 bg-[#e8f5f5] shadow-xs">
					<CardContent className="p-6">
						<div className="flex items-start gap-3 mb-4">
							<Calendar className="h-5 w-5 text-[#017c7d] shrink-0 mt-0.5" />
							<div>
								<h3 className="font-semibold text-[#1e2a2f] mb-1">This Sunday</h3>
								<p className="text-sm text-[#5b6b72]">{getNextSunday()}</p>
							</div>
						</div>
						<div className="space-y-3 text-sm text-[#1e2a2f]">
							<div className="flex items-start gap-3">
								<MapPin className="h-4 w-4 text-[#017c7d] shrink-0 mt-0.5" />
								<div>
									<p className="font-medium">Sunday School</p>
									<p className="text-[#5b6b72]">
										Family Life Enrichment Center • 9:30 AM Service
									</p>
								</div>
							</div>
							<p className="text-[#5b6b72] pl-7">
								Check in at the Children&apos;s Ministry desk when you arrive.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Bible Bee Link */}
				{childrenEnrolledInBibleBee && (
					<Card className="border-[#eae4da] shadow-xs">
						<CardContent className="p-6">
							<h3 className="font-semibold text-[#1e2a2f] mb-3">
								Bible Bee Enrollment
							</h3>
							<p className="text-sm text-[#5b6b72] mb-4">
								Your children are enrolled in Bible Bee. Review scripture passages and
								program details.
							</p>
							<Button
								variant="outline"
								onClick={() => router.push('/bible-bee')}
								className="w-full border-[#017c7d] text-[#017c7d] hover:bg-[#017c7d] hover:text-white">
								View Scripture Assignments
							</Button>
						</CardContent>
					</Card>
				)}

				{/* Go to Household */}
				<Button
					onClick={() => router.push('/household')}
					className="w-full bg-[#017c7d] hover:bg-[#016566] text-white py-6 text-base font-semibold">
					Go to My Household
				</Button>
			</div>
		</div>
	);
}
