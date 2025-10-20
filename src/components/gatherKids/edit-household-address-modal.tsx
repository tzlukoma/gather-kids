'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUpdateHousehold } from '@/hooks/data';
import type { Household } from '@/lib/types';

const householdSchema = z.object({
  name: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required.'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  zip: z.string().min(1, 'ZIP code is required.'),
  preferredScriptureTranslation: z.string().optional(),
});

type HouseholdFormData = z.infer<typeof householdSchema>;

interface EditHouseholdAddressModalProps {
  household: Household;
  onClose: () => void;
}

export function EditHouseholdAddressModal({ household, onClose }: EditHouseholdAddressModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const updateHouseholdMutation = useUpdateHousehold();

  const form = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: household.name || '',
      address_line1: household.address_line1 || '',
      address_line2: household.address_line2 || '',
      city: household.city || '',
      state: household.state || '',
      zip: household.zip || '',
      preferredScriptureTranslation: household.preferredScriptureTranslation || 'NIV',
    },
  });

  const onSubmit = async (data: HouseholdFormData) => {
    setIsLoading(true);
    try {
      await updateHouseholdMutation.mutateAsync({
        householdId: household.household_id,
        data: {
          name: data.name || undefined,
          address_line1: data.address_line1,
          address_line2: data.address_line2 || undefined,
          city: data.city,
          state: data.state,
          zip: data.zip,
          preferredScriptureTranslation: data.preferredScriptureTranslation || undefined,
        },
      });
      
      toast({
        title: 'Household Updated',
        description: 'Household information has been updated successfully.',
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save household:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save the household information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Household Information</DialogTitle>
          <DialogDescription>
            Update the household address and basic information below.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Household Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="The Smith Family" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2 (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Apt 4B" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Anytown" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="preferredScriptureTranslation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Scripture Translation</FormLabel>
                  <FormControl>
                    <Input placeholder="NIV" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
