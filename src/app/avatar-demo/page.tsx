'use client';

import { useState } from 'react';
import { Avatar } from '@/components/avatar/Avatar';
import { AvatarUpload } from '@/components/avatar/AvatarUpload';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db as dexieDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export default function AvatarTestPage() {
	const [testChildId, setTestChildId] = useState<string>('');

	const createTestChild = async () => {
		const childId = uuidv4();
		const now = new Date().toISOString();

		try {
			await dexieDb.children.add({
				child_id: childId,
				household_id: 'test-household',
				first_name: 'Test',
				last_name: 'Child',
				is_active: true,
				created_at: now,
				updated_at: now,
			});

			setTestChildId(childId);
			console.log('Created test child with ID:', childId);
		} catch (error) {
			console.error('Failed to create test child:', error);
		}
	};

	const handleAvatarUpload = (url: string) => {
		// keep a light-weight log for demo uploads; no local state needed here
		console.log('Avatar uploaded:', url);
	};

	return (
		<div className="container mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold">Avatar Storage Demo</h1>
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Create Test Child</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<Button onClick={createTestChild}>
							Create Test Child
						</Button>
						{testChildId && (
							<p className="text-sm text-muted-foreground">
								Child ID: {testChildId}
							</p>
						)}
					</CardContent>
				</Card>

				{testChildId && (
					<Card>
						<CardHeader>
							<CardTitle>Avatar Upload</CardTitle>
						</CardHeader>
						<CardContent>
							<AvatarUpload
								entityType="children"
								entityId={testChildId}
								size="lg"
								onUploadComplete={handleAvatarUpload}
							/>
						</CardContent>
					</Card>
				)}
			</div>

			{testChildId && (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Avatar Display - Small</CardTitle>
						</CardHeader>
						<CardContent className="flex justify-center">
							<Avatar
								entityType="children"
								entityId={testChildId}
								size="sm"
								fallback="TC"
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Avatar Display - Medium</CardTitle>
						</CardHeader>
						<CardContent className="flex justify-center">
							<Avatar
								entityType="children"
								entityId={testChildId}
								size="md"
								fallback="TC"
							/>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Avatar Display - Large</CardTitle>
						</CardHeader>
						<CardContent className="flex justify-center">
							<Avatar
								entityType="children"
								entityId={testChildId}
								size="lg"
								fallback="TC"
							/>
						</CardContent>
					</Card>
				</div>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Demo Instructions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<p>1. Click &quot;Create Test Child&quot; to create a test record</p>
					<p>2. Upload an image file (max 512KB) using the avatar upload component</p>
					<p>3. See the avatar displayed in different sizes below</p>
					<p>4. Try uploading different images to see the update functionality</p>
					<p>5. Use the &quot;Remove&quot; button to delete the avatar</p>
					<div className="mt-4 p-4 bg-muted rounded">
						<p className="text-sm">
							<strong>Technical Details:</strong> This demo uses IndexedDB (demo mode) to store 
							base64-encoded WebP images. In production, Supabase Storage would be used instead.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}