
"use client"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"

const fellowshipInterests = [
    { id: "teen_podcast", label: "Podcast & YouTube Channel Projects" },
    { id: "teen_social_media", label: "Being on our Social Media Team" },
    { id: "teen_community_service", label: "Leading Community Service Projects" },
];

export function TeenFellowshipForm({ control }: { control: any }) {
    return (
        <div className="mt-4 space-y-4 p-4 border rounded-md">
            <FormLabel>Are you interested in participating in our:</FormLabel>
            <div className="space-y-2">
                {fellowshipInterests.map(interest => (
                    <FormField
                        key={interest.id}
                        control={control}
                        name={`children[0].ministrySelections.${interest.id}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {interest.label}
                                </FormLabel>
                            </FormItem>
                        )}
                    />
                ))}
            </div>
        </div>
    )
}
