"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon, FileDown, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { mockChildren } from "@/lib/mock-data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2024, 0, 20),
    to: new Date(2024, 0, 20),
  })

  const checkedInChildren = mockChildren.filter(c => c.checkedIn);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Reports & Exports</h1>
        <p className="text-muted-foreground">
          Generate reports and export data for ministry records.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Emergency Snapshot</CardTitle>
                <CardDescription>Today’s roster with critical allergy and contact information.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Allergies</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {checkedInChildren.map(child => (
                             <TableRow key={child.id}>
                                <TableCell className="font-medium">{child.firstName} {child.lastName}</TableCell>
                                <TableCell>
                                    {child.allergies ? <Badge variant="destructive">{child.allergies}</Badge> : 'None'}
                                </TableCell>
                                <TableCell>{child.safetyInfo ?? 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                 <Button className="ml-auto">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Attendance Rollup</CardTitle>
                <CardDescription>Generate an attendance report for a specific date range.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date?.from ? (
                            date.to ? (
                                <>
                                {format(date.from, "LLL dd, y")} -{" "}
                                {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="p-4 bg-secondary rounded-md text-center">
                    <p className="font-bold text-3xl font-headline">125</p>
                    <p className="text-sm text-muted-foreground">Total Check-Ins in Selected Range</p>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="ml-auto">
                    <FileDown className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </CardFooter>
        </Card>
      </div>

    </div>
  )
}
