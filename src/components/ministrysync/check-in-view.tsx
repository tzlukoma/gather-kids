'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Child } from '@/lib/types';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';

interface CheckInViewProps {
  initialChildren: Child[];
}

export function CheckInView({ initialChildren }: CheckInViewProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);
  const { toast } = useToast();

  const handleCheckIn = (childId: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, checkedIn: true, checkInTime: new Date() } : c))
    );
    const child = children.find(c => c.id === childId);
    toast({
      title: 'Checked In',
      description: `${child?.firstName} ${child?.lastName} has been checked in.`,
    });
  };

  const handleCheckout = (childId: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, checkedIn: false } : c))
    );
  };
  
  const openCheckoutDialog = (child: Child) => {
    setChildToCheckout(child);
  };

  const closeCheckoutDialog = () => {
    setChildToCheckout(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {children.map((child) => (
          <Card key={child.id} className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
               <Image
                    src={`https://placehold.co/80x80.png`}
                    data-ai-hint="child portrait"
                    alt={`Photo of ${child.firstName}`}
                    width={60}
                    height={60}
                    className="rounded-full border-2 border-primary"
                />
              <div className="flex-1">
                <CardTitle className="font-headline text-lg">{`${child.firstName} ${child.lastName}`}</CardTitle>
                 {child.checkedIn ? (
                    <Badge variant="default" className="mt-1 bg-green-500 hover:bg-green-600">Checked In</Badge>
                ) : (
                    <Badge variant="secondary">Checked Out</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Grade:</strong> {child.grade}</p>
                {child.allergies && <p className="text-destructive"><strong>Allergies:</strong> {child.allergies}</p>}
                {child.safetyInfo && <p><strong>Notes:</strong> {child.safetyInfo}</p>}
              </div>
            </CardContent>
            <CardFooter>
              {child.checkedIn ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => openCheckoutDialog(child)}
                >
                  Check Out
                </Button>
              ) : (
                <Button className="w-full" onClick={() => handleCheckIn(child.id)}>
                  Check In
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <CheckoutDialog
        child={childToCheckout}
        onClose={closeCheckoutDialog}
        onCheckout={handleCheckout}
      />
    </>
  );
}
