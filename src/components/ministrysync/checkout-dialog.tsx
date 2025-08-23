
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
import type { Child, Guardian, Attendance } from "@/lib/types"

interface EnrichedChild extends Child {
    activeAttendance: Attendance | null;
    guardians: Guardian[];
}

interface CheckoutDialogProps {
  child: EnrichedChild | null
  onClose: () => void
  onCheckout: (childId: string, attendanceId: string) => void
}

const eventNames: { [key: string]: string } = {
  'evt_sunday_school': 'Sunday School',
  'min_choir_kids': "Children's Choir Practice",
  'min_youth_group': 'Youth Group',
};

const getEventName = (eventId: string | null) => {
    if (!eventId) return '';
    return eventNames[eventId] || 'an event';
}

export function CheckoutDialog({ child, onClose, onCheckout }: CheckoutDialogProps) {
  const [pin, setPin] = useState("")
  const { toast } = useToast()

  const handleVerifyAndCheckout = () => {
    if (!child) return;

    const guardianPhones = child.guardians.map(g => g.mobile_phone.slice(-4));
    const householdPin = '1234'; // This would be fetched with household data

    if (guardianPhones.includes(pin) || pin === householdPin) {
      if (child.activeAttendance?.attendance_id) {
        onCheckout(child.child_id, child.activeAttendance.attendance_id)
      }
      onClose()
    } else {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Invalid PIN or phone number last 4 digits. Please try again.",
      })
    }
    setPin("")
  }

  return (
    <Dialog open={!!child} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Guardian Verification for {child?.first_name}</DialogTitle>
          <DialogDescription>
            To check out {child?.first_name} from {getEventName(child?.activeAttendance?.event_id || null)}, please enter the last 4 digits of an authorized guardian's phone number or the 4-digit household PIN.
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

    