
"use client"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "../ui/alert"

export function DanceMinistryForm({ control }: { control: any }) {
    return (
        <div className="mt-4 space-y-4">
            <FormField
                control={control}
                name="customData.dance_returning_member"
                render={({ field }) => (
                <FormItem className="space-y-3 p-4 border rounded-md">
                    <FormLabel>Are you a returning member of the dance ministry?</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                    >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value="yes" />
                        </FormControl>
                        <FormLabel className="font-normal">Yes</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                            <RadioGroupItem value="no" />
                        </FormControl>
                        <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                    </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <Alert>
                <AlertDescription>
                    <p>Thank you for registering for the Dance Ministry.</p>
                    <p>You will receive information from ministry leaders regarding next steps for your child's participation.</p>
                </AlertDescription>
            </Alert>
        </div>
    )
}
