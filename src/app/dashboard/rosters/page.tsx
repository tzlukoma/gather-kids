import { mockChildren } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function RostersPage() {
  const allChildren = mockChildren;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Class Rosters</h1>
        <p className="text-muted-foreground">
          View real-time rosters for all classes.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">All Children</CardTitle>
                <CardDescription>A complete list of all children registered.</CardDescription>
            </div>
            <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-In Time</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allChildren.map((child) => (
                <TableRow key={child.id}>
                  <TableCell className="font-medium">{`${child.firstName} ${child.lastName}`}</TableCell>
                  <TableCell>{child.grade}</TableCell>
                  <TableCell>
                    {child.checkedIn ? (
                      <Badge className="bg-green-500 hover:bg-green-600">Checked In</Badge>
                    ) : (
                      <Badge variant="secondary">Checked Out</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {child.checkInTime ? child.checkInTime.toLocaleTimeString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {child.allergies && (
                      <Badge variant="destructive">Allergy</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
