
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

interface IncidentDetailsDialogProps {
  incidents: Incident[] | null
  onClose: () => void
}

export function IncidentDetailsDialog({ incidents, onClose }: IncidentDetailsDialogProps) {

  const handleClose = () => {
    onClose();
  }

  if (!incidents || incidents.length === 0) return null;

  const firstIncident = incidents[0];

  return (
    <Dialog open={!!incidents} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Incident Details</DialogTitle>
          <DialogDescription>
            {incidents.length} {incidents.length > 1 ? 'incidents were' : 'incident was'} reported for {firstIncident.child_name}.
          </DialogDescription>
        </DialogHeader>
        
        <Carousel className="w-full">
            <CarouselContent>
                {incidents.map((incident, index) => (
                    <CarouselItem key={incident.incident_id}>
                        <div className="p-1">
                            <div className="space-y-4 py-4">
                                <div className="text-center text-sm text-muted-foreground">
                                    Incident {index + 1} of {incidents.length}
                                </div>
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
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
             {incidents.length > 1 && (
                <>
                    <CarouselPrevious />
                    <CarouselNext />
                </>
            )}
        </Carousel>


        <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
