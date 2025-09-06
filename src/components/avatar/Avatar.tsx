import { useEffect, useState } from 'react';
import { AvatarService } from '@/lib/avatar/avatar-service';
import type { AvatarType } from '@/lib/avatar/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AvatarProps {
	entityType: AvatarType;
	entityId: string;
	size?: 'xs' | 'sm' | 'md' | 'lg';
	fallback?: string;
	className?: string;
}

export function Avatar({
	entityType,
	entityId,
	size = 'md',
	fallback,
	className,
}: AvatarProps) {
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Size mapping
	const sizeMap = {
		xs: 'h-8 w-8 text-xs',
		sm: 'h-10 w-10 text-sm',
		md: 'h-16 w-16 text-lg',
		lg: 'h-24 w-24 text-xl',
	};

	useEffect(() => {
		const fetchAvatar = async () => {
			if (!entityId) return;

			try {
				const url = await AvatarService.getAvatarUrl(entityType, entityId);
				setAvatarUrl(url);
			} catch (error) {
				console.error('Error fetching avatar:', error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAvatar();
	}, [entityType, entityId]);

	if (isLoading) {
		return (
			<Skeleton className={cn('rounded-full', sizeMap[size], className)} />
		);
	}

	return (
		<div
			className={cn(
				'relative rounded-full overflow-hidden bg-muted flex items-center justify-center',
				sizeMap[size],
				className
			)}>
			{avatarUrl ? (
				<Image
					src={avatarUrl}
					alt="Avatar"
					fill
					className="object-cover"
					onError={() => setAvatarUrl(null)}
				/>
			) : (
				<div className="flex items-center justify-center w-full h-full">
					{fallback ? (
						<span className="font-medium text-muted-foreground">
							{fallback.substring(0, 2).toUpperCase()}
						</span>
					) : (
						<User className="text-muted-foreground w-1/2 h-1/2" />
					)}
				</div>
			)}
		</div>
	);
}