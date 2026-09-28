'use client';

import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserAvatar } from '@/hooks/data/branding';

interface UserAvatarProps {
	userId: string | undefined;
	alt: string;
	className: string;
	fallback: ReactNode;
}

/**
 * Renders the current user's profile photo wherever an app shell needs it.
 * The query runs through the DAL using the signed-in browser Supabase client;
 * avatar read access remains governed by the existing RLS policy.
 */
export function UserAvatar({ userId, alt, className, fallback }: UserAvatarProps) {
	const { data: photoUrl } = useUserAvatar(userId);

	return (
		<Avatar className={className}>
			<AvatarImage src={photoUrl ?? undefined} alt={alt} />
			<AvatarFallback>{fallback}</AvatarFallback>
		</Avatar>
	);
}
