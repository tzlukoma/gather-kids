
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { Child } from "@/lib/types"

interface CheckoutDialogProps {
  child: Child | null
  onClose: () => void
  onCheckout: (childId: string) => void
}

const eventNames: { [key: string]: string } = {
  'sunday-school': 'Sunday School',
  'choir-practice': "Children's Choir Practice",
  'youth-group': 'Youth Group',
};

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    return eventNames[eventId] || 'an event';
}

export function CheckoutDialog({ child, onClose, onCheckout }: CheckoutDialogProps) {
  const [pin, setPin] = useState("")
  const { toast } = useToast()

  const handleVerifyAndCheckout = () => {
    // In a real app, this would involve an API call to verify the PIN.
    if (pin === "2222" || pin === "1234") {
      // Toast is now handled in the onCheckout function to be more specific
      if (child) {
        onCheckout(child.id)
      }
      onClose()
    } else {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Invalid PIN or phone number. Please try again.",
      })
    }
    setPin("")
  }

  return (
    <Dialog open={!!child} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Guardian Verification for {child?.firstName}</DialogTitle>
          <DialogDescription>
            To check out {child?.firstName} from {getEventName(child?.checkedInEvent)}, please enter the last 4 digits of an authorized guardian's phone number or the 4-digit household PIN.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pin" className="text-right">
              PIN / Phone
            </Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="col-span-3"
              maxLength={4}
              type="password"
              placeholder="••••"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleVerifyAndCheckout}>Verify & Check Out</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
