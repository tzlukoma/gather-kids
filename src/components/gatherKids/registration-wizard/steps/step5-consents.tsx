import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import type { RegistrationFormInput } from '../registration-schema';

interface Step5ConsentsProps {
	form: UseFormReturn<RegistrationFormInput>;
}

export function Step5Consents({ form }: Step5ConsentsProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl font-bold text-[#1e2a2f]">
					Review and Sign Consents
				</CardTitle>
				<CardDescription className="text-[#5b6b72]">
					Read and accept these required agreements to complete your registration.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<FormField
					control={form.control}
					name="consents.liability"
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-x-3 space-y-0 border border-[#e0dacf] p-4 rounded-lg">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
									className="mt-1 border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
								/>
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Liability Release *
								</FormLabel>
								<FormDescription className="text-sm text-[#5b6b72] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2">
									In consideration of my child&apos;s participation in the Youth Ministry, I
									hereby release, waive, relinquish and forever discharge any and all
									liability or claims I may have or which may arise from my child&apos;s
									participation in the above described event, and agree to defend,
									indemnify and hold harmless Cathedral International, Cathedral
									International Youth Ministry, their affiliates, related entities,
									employees, trustees, directors, respective staff, leaders and volunteers
									from any and all liability, claims, lawsuits, demands, judgments or
									damages for personal injury as well as property damage and any expenses,
									costs and fees of any type, kind or nature which may arise from my
									child&apos;s participation in the above described event. I hereby agree to
									assume sole responsibility for any damages incurred as a result of the
									negligent, willful or intentional act of my child and to reimburse
									Cathedral International for the cost of same, including but not to any
									costs to defend any and all liability, claims, lawsuits, demands,
									judgments or damages for personal injury as well as property damage.
									Parents, please note that once children are dismissed from ministry
									activities and returned into your supervision, they are no longer under
									the care and supervision of Cathedral International staff or volunteers.
								</FormDescription>
								<FormMessage className="text-destructive" />
							</div>
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="consents.photoRelease"
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-x-3 space-y-0 border border-[#e0dacf] p-4 rounded-lg">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
									className="mt-1 border-[#017c7d] data-[state=checked]:bg-[#017c7d]"
								/>
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel className="text-[#1e2a2f] font-semibold">
									Photo Release *
								</FormLabel>
								<FormDescription className="text-sm text-[#5b6b72] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2">
									I freely sign this Agreement and Release of Liability Form. Photo/Video
									Release and I hereby grant Cathedral International permission to use my
									photograph/video image in any and all publications for Cathedral
									International including website and social media entries, without payment
									or any other consideration in perpetuity. I hereby authorize Cathedral
									International to edit, alter, copy, exhibit, publish, or distribute all
									photos and images. I waive the right to inspect or approve the finished
									product, including a written or electronic copy, wherein my photo
									appears. Additionally, I waive any right to royalties or other
									compensation arising or related to the use of the photograph or video
									images. I hereby hold harmless and release and forever discharge Cathedral
									International from all claims, demands, and causes of action which I, my
									heirs, representatives, executors, administrators, or any other persons
									acting on my behalf or on behalf of my estate may have. I have read the
									above photo/video release and fully understand its contents. I voluntarily
									agree to the terms and conditions stated above.
								</FormDescription>
								<FormMessage className="text-destructive" />
							</div>
						</FormItem>
					)}
				/>

				<div className="pt-4 border-t border-[#e0dacf]">
					<p className="text-sm text-[#5b6b72] italic">
						By checking both boxes above and submitting this form, you acknowledge that you
						have read, understood, and agree to these terms.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
