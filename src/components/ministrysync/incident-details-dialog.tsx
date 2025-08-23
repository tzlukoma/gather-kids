
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Incident } from "@/lib/types"
import { format } from "date-fns"
import { Badge } from "../ui/badge"

interface IncidentDetailsDialogProps {
  incident: Incident | null
  onClose: () => void
}

export function IncidentDetailsDialog({ incident, onClose }: IncidentDetailsDialogProps) {

  const handleClose = () => {
    onClose();
  }

  if (!incident) return null;

  return (
    <Dialog open={!!incident} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Incident Details</DialogTitle>
          <DialogDescription>
            An incident was reported for {incident.child_name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Child</span>
                <span className="font-medium">{incident.child_name}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Time</span>
                <span className="font-medium">{format(new Date(incident.timestamp), "PPpp")}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Severity</span>
                <Badge variant={incident.severity === "high" ? "destructive" : incident.severity === "medium" ? "secondary" : "outline"} className="capitalize">
                    {incident.severity}
                </Badge>
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm p-3 bg-muted rounded-md">{incident.description}</p>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reported By</span>
                <span className="font-medium">{incident.leader_id}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={incident.admin_acknowledged_at ? "default" : "destructive"} className={incident.admin_acknowledged_at ? 'bg-green-500 hover:bg-green-600' : ''}>
                    {incident.admin_acknowledged_at ? "Acknowledged" : "Pending"}
                </Badge>
            </div>
        </div>

        <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
