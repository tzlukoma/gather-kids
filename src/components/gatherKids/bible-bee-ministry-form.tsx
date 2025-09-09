'use client';

import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

export function BibleBeeMinistryForm({ control }: { control: any }) {
	return (
		<div className="mt-4 space-y-4">
			<FormField
				control={control}
				name="household.preferredScriptureTranslation"
				render={({ field }) => (
					<FormItem className="space-y-3 p-4 border rounded-md">
						<FormLabel>Preferred Bible Translation</FormLabel>
						<FormDescription>
							Select the Bible translation your family prefers for scripture
							memorization in Bible Bee.
						</FormDescription>
						<Select onValueChange={field.onChange} defaultValue={field.value}>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="Select a Bible translation" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								<SelectItem value="NIV">
									NIV - New International Version
								</SelectItem>
								<SelectItem value="KJV">KJV - King James Version</SelectItem>
								<SelectItem value="NIV-Spanish">
									NIV-Spanish - Nueva Versión Internacional
								</SelectItem>
							</SelectContent>
						</Select>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}
