'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface RegistrationDoneProps {
	childrenEnrolledInBibleBee?: boolean;
}

export function RegistrationDone({ childrenEnrolledInBibleBee = false }: RegistrationDoneProps) {
	const router = useRouter();

	return (
		<div className="min-h-screen bg-[#f7f5f1] flex items-center justify-center px-4 py-8">
			<div className="max-w-md w-full">
				<Card className="border-[#eae4da] shadow-sm">
					<CardContent className="p-8 text-center space-y-6">
						<div className="flex justify-center">
							<div className="bg-[#017c7d] rounded-full p-4">
								<CheckCircle2 className="h-12 w-12 text-white" />
							</div>
						</div>
						
						<div className="space-y-2">
							<h1 className="text-3xl font-bold text-[#1e2a2f]">
								Registration Complete!
							</h1>
							<p className="text-[#5b6b72] leading-relaxed">
								Thank you! Your family&apos;s registration has been received.
							</p>
						</div>

						{childrenEnrolledInBibleBee && (
							<div className="pt-2 pb-2 border-t border-[#eae4da]">
								<p className="text-sm text-[#5b6b72] mb-3">
									Your children are enrolled in Bible Bee. Review scripture passages:
								</p>
								<Button
									variant="outline"
									onClick={() => router.push('/bible-bee')}
									className="border-[#017c7d] text-[#017c7d] hover:bg-[#017c7d] hover:text-white">
									View Scripture Assignments
								</Button>
							</div>
						)}

						<Button
							onClick={() => router.push('/household')}
							className="w-full bg-[#017c7d] hover:bg-[#016566] text-white py-6 text-base font-semibold">
							Go to My Household
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
