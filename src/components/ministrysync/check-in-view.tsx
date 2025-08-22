
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Child } from '@/lib/types';
import { CheckoutDialog } from './checkout-dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CheckInViewProps {
  initialChildren: Child[];
}

export function CheckInView({ initialChildren }: CheckInViewProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren);
  const [childToCheckout, setChildToCheckout] = useState<Child | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleCheckIn = (childId: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, checkedIn: true, checkInTime: new Date().toISOString() } : c))
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

  const filteredChildren = useMemo(() => {
    if (!searchQuery) {
      return children;
    }
    return children.filter(child =>
      `${child.firstName} ${child.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, children]);

  return (
    <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by child's name..."
          className="w-full pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredChildren.map((child) => (
          <Card key={child.id} className="flex flex-col">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
               <div className="w-[60px] h-[60px] flex items-center justify-center rounded-full border-2 border-primary bg-secondary">
                    <User className="h-8 w-8 text-muted-foreground" />
               </div>
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
       {filteredChildren.length === 0 && (
        <div className="text-center col-span-full py-12">
            <p className="text-muted-foreground">No children found matching your search.</p>
        </div>
       )}
      <CheckoutDialog
        child={childToCheckout}
        onClose={closeCheckoutDialog}
        onCheckout={handleCheckout}
      />
    </>
  );
}
