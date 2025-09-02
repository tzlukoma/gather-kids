import { useState, useRef } from 'react';
import { AvatarService, MAX_AVATAR_SIZE } from '@/lib/avatar/avatar-service';
import type { AvatarType } from '@/lib/avatar/types';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
	entityType: AvatarType;
	entityId: string;
	currentUrl?: string | null;
	size?: 'sm' | 'md' | 'lg';
	onUploadComplete?: (url: string) => void;
	className?: string;
}

export function AvatarUpload({
	entityType,
	entityId,
	currentUrl,
	size = 'md',
	onUploadComplete,
	className,
}: AvatarUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl || null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Size mapping
	const sizeMap = {
		sm: 'h-12 w-12',
		md: 'h-24 w-24',
		lg: 'h-32 w-32',
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);

		try {
			const url = await AvatarService.uploadAvatar(entityType, entityId, file);
			setAvatarUrl(url);
			if (onUploadComplete) {
				onUploadComplete(url);
			}
			toast({ title: 'Avatar uploaded successfully' });
		} catch (error) {
			console.error('Avatar upload failed:', error);
			toast({
				title: 'Upload failed',
				description: error instanceof Error ? error.message : 'Unknown error',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);

			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDelete = async () => {
		if (!confirm('Are you sure you want to remove this avatar?')) return;

		setIsUploading(true);

		try {
			await AvatarService.deleteAvatar(entityType, entityId);
			setAvatarUrl(null);
			if (onUploadComplete) {
				onUploadComplete('');
			}
			toast({ title: 'Avatar removed successfully' });
		} catch (error) {
			console.error('Avatar removal failed:', error);
			toast({
				title: 'Removal failed',
				description: 'Could not remove the avatar',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className={cn('flex flex-col items-center gap-2', className)}>
			<div
				className={cn(
					'relative border rounded-full overflow-hidden bg-muted flex items-center justify-center',
					sizeMap[size]
				)}>
				{avatarUrl ? (
					<Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
				) : (
					<span className="text-muted-foreground text-2xl">
						{entityType === 'children'
							? 'C'
							: entityType === 'guardians'
							? 'G'
							: 'L'}
					</span>
				)}

				{isUploading && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<Loader2 className="animate-spin text-white" size={24} />
					</div>
				)}
			</div>

			<div className="flex gap-2">
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploading}>
					<Upload size={14} className="mr-1" />
					{avatarUrl ? 'Change' : 'Upload'}
				</Button>

				{avatarUrl && (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={handleDelete}
						disabled={isUploading}>
						<X size={14} className="mr-1" />
						Remove
					</Button>
				)}
			</div>

			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept="image/*"
				className="hidden"
			/>

			<p className="text-xs text-muted-foreground mt-1">
				Upload an image (max {MAX_AVATAR_SIZE / 1024}KB)
			</p>
		</div>
	);
}