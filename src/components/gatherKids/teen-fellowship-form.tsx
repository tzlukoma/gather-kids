
"use client"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import type { CustomQuestion } from "@/lib/types"

interface TeenFellowshipFormProps {
    control: any;
    childIndex: number;
    customQuestions: CustomQuestion[];
}

export function TeenFellowshipForm({ control, childIndex, customQuestions }: TeenFellowshipFormProps) {
    if (customQuestions.length === 0) return null;

    return (
        <div className="mt-4 space-y-4 p-4 border rounded-md">
            <FormLabel>Are you interested in participating in our:</FormLabel>
            <div className="space-y-2">
                {customQuestions.map(question => (
                    <FormField
                        key={question.id}
                        control={control}
                        name={`children[${childIndex}].customData.${question.id}`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {question.text}
                                </FormLabel>
                            </FormItem>
                        )}
                    />
                ))}
            </div>
        </div>
    )
}
