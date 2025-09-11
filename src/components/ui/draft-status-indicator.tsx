import { Clock, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraftStatusIndicatorProps {
	isSaving: boolean;
	lastSaved: Date | null;
	error: string | null;
	className?: string;
}

export function DraftStatusIndicator({
	isSaving,
	lastSaved,
	error,
	className,
}: DraftStatusIndicatorProps) {
	if (error) {
		return (
			<div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
				<AlertCircle className="h-4 w-4" />
				<span>Error saving: {error}</span>
			</div>
		);
	}

	if (isSaving) {
		return (
			<div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
				<Clock className="h-4 w-4 animate-spin" />
				<span>Saving...</span>
			</div>
		);
	}

	if (lastSaved) {
		const timeAgo = formatTimeAgo(lastSaved);
		return (
			<div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
				<Check className="h-4 w-4 text-green-600" />
				<span>Saved {timeAgo}</span>
			</div>
		);
	}

	return null;
}

function formatTimeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);

	if (diffSeconds < 60) {
		return 'just now';
	} else if (diffMinutes < 60) {
		return `${diffMinutes}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else {
		return date.toLocaleDateString();
	}
}