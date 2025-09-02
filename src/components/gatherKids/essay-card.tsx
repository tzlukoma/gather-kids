'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EssayPrompt } from '@/lib/types';

interface EssayCardProps {
  essayPrompt: EssayPrompt;
}

export default function EssayCard({ essayPrompt }: EssayCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Essay Assignment</CardTitle>
        <CardDescription>
          {essayPrompt.division_name && `For ${essayPrompt.division_name} Division`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Prompt:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {essayPrompt.prompt_text}
            </p>
          </div>
          {essayPrompt.due_date && (
            <div>
              <h4 className="font-medium mb-1">Due Date:</h4>
              <p className="text-sm text-muted-foreground">
                {new Date(essayPrompt.due_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}