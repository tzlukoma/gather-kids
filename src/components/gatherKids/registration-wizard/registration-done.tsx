'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, MapPin } from 'lucide-react';

interface RegistrationDoneProps {
	childrenEnrolledInBibleBee?: boolean;
	registeredChildren?: Array<{
		name: string;
		ministries: string[];
	}>;
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
		<div className="min-h-screen bg-[#f7f5f1] flex items-center justify-center px-4 py-8">
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
					<Card className="border-[#eae4da] shadow-sm">
						<CardContent className="p-6">
							<div className="flex items-center gap-2 mb-4">
								<CheckCircle2 className="h-5 w-5 text-[#017c7d]" />
								<h2 className="text-lg font-semibold text-[#1e2a2f]">
									Confirmed Registration
								</h2>
							</div>
							<div className="space-y-4">
								{registeredChildren.map((child, index) => (
									<div key={index} className="pb-4 border-b border-[#eae4da] last:border-0 last:pb-0">
										<p className="font-semibold text-[#1e2a2f] mb-2">{child.name}</p>
										<div className="space-y-1">
											{child.ministries.length > 0 ? (
												child.ministries.map((ministry, mIndex) => (
													<div key={mIndex} className="flex items-center gap-2 text-sm text-[#5b6b72]">
														<div className="h-1.5 w-1.5 rounded-full bg-[#017c7d]" />
														<span>{ministry}</span>
													</div>
												))
											) : (
												<div className="flex items-center gap-2 text-sm text-[#5b6b72]">
													<div className="h-1.5 w-1.5 rounded-full bg-[#017c7d]" />
													<span>Sunday School</span>
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{/* This Sunday Card */}
				<Card className="border-[#017c7d] border-2 bg-[#e8f5f5] shadow-sm">
					<CardContent className="p-6">
						<div className="flex items-start gap-3 mb-4">
							<Calendar className="h-5 w-5 text-[#017c7d] flex-shrink-0 mt-0.5" />
							<div>
								<h3 className="font-semibold text-[#1e2a2f] mb-1">This Sunday</h3>
								<p className="text-sm text-[#5b6b72]">{getNextSunday()}</p>
							</div>
						</div>
						<div className="space-y-3 text-sm text-[#1e2a2f]">
							<div className="flex items-start gap-3">
								<MapPin className="h-4 w-4 text-[#017c7d] flex-shrink-0 mt-0.5" />
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
					<Card className="border-[#eae4da] shadow-sm">
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
