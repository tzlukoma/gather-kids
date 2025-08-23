"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Progress } from "../ui/progress"
import { Badge } from "../ui/badge"
import { useLiveQuery } from "dexie-react-hooks"
import { queryDashboardMetrics } from "@/lib/dal"

const chartData = [
  { grade: "Pre-K", missing: 1, total: 10 },
  { grade: "K", missing: 3, total: 15 },
  { grade: "1st", missing: 2, total: 12 },
  { grade: "2nd", missing: 0, total: 18 },
  { grade: "3rd", missing: 1, total: 20 },
  { grade: "4th", missing: 4, total: 14 },
  { grade: "5th", missing: 2, total: 16 },
]

const chartConfig = {
  missing: {
    label: "Missing Consents",
    color: "hsl(var(--accent))",
  },
}

export function DashboardCharts() {
  const metrics = useLiveQuery(() => queryDashboardMetrics("2025"));

  if (!metrics) {
    return <div>Loading metrics...</div>
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Registration Completion</CardTitle>
                <CardDescription>Percentage of families who have completed registration.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-center p-6">
                    <div className="relative h-40 w-40">
                        <svg className="h-full w-full" width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="2"></circle>
                            <g className="origin-center -rotate-90 transform">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-current text-primary" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - metrics.completionPct}></circle>
                            </g>
                        </svg>
                        <div className="absolute top-1/2 start-1/2 transform -translate-y-1/2 -translate-x-1/2">
                            <span className="text-center text-3xl font-bold text-gray-800 dark:text-white">{metrics.completionPct}%</span>
                        </div>
                    </div>
                </div>
                <div className="text-center text-muted-foreground">
                    <p>{metrics.completedCount} out of {metrics.totalCount} families completed.</p>
                </div>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Missing Consents by Grade</CardTitle>
                <CardDescription>Number of children with outstanding consent forms.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground">Chart not implemented yet. Total missing consents: {metrics.missingConsentsCount}</p>
                {/* <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="grade"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value}
                    />
                    <YAxis />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="missing" fill="var(--color-missing)" radius={4} />
                </BarChart>
                </ChartContainer> */}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Choir Eligibility</CardTitle>
                <CardDescription>Warnings for children outside the eligible age range.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {metrics.choirEligibilityWarnings.map(warning => (
                    <div key={warning.child_id} className="flex justify-between items-center p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/50">
                        <div>
                            <p className="font-semibold">{warning.child_name}</p>
                            <p className="text-sm text-muted-foreground">{warning.reason}</p>
                        </div>
                        <Badge variant="outline" className="text-yellow-700 border-yellow-700">Warning</Badge>
                    </div>
                ))}
                {metrics.choirEligibilityWarnings.length === 0 && <p className="text-muted-foreground text-sm">No eligibility warnings.</p>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Volunteers Needed</CardTitle>
                <CardDescription>Sunday School classes that are understaffed.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span>1st Grade Class</span>
                    <Badge variant="destructive">1/3 Staff</Badge>
                </div>
                <Progress value={33} />
                 <div className="flex justify-between items-center">
                    <span>Pre-K Class</span>
                    <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">2/3 Staff</Badge>
                </div>
                <Progress value={66} />
                 <div className="flex justify-between items-center">
                    <span>5th Grade Class</span>
                    <Badge>3/3 Staff</Badge>
                </div>
                <Progress value={100} />
            </CardContent>
        </Card>
    </div>
  )
}
