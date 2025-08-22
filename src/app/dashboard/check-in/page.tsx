import { mockChildren } from '@/lib/mock-data';
import { CheckInView } from '@/components/ministrysync/check-in-view';

export default function CheckInPage() {
  // In a real application, you would fetch this data from your database.
  const children = mockChildren;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Child Check-In &amp; Out</h1>
        <p className="text-muted-foreground">
          Manage child check-ins and check-outs for today's services.
        </p>
      </div>
      <CheckInView initialChildren={children} />
    </div>
  );
}
