'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Child } from '@/lib/types';
import { useUpdateChildPhotoMutation } from '@/lib/hooks/useData';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface PhotoCaptureDialogProps {
	child: Child | null;
	onClose: () => void;
}

export function PhotoCaptureDialog({
	child,
	onClose,
}: PhotoCaptureDialogProps) {
	const { toast } = useToast();
	const updatePhotoMutation = useUpdateChildPhotoMutation();
	const [activeTab, setActiveTab] = useState('camera');
	const [imageData, setImageData] = useState<string | null>(null);
	const [hasCameraPermission, setHasCameraPermission] = useState<
		boolean | null
	>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
		undefined
	);

	const videoRef = useRef<HTMLVideoElement>(null);
	const photoRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	const startCamera = useCallback(
		async (deviceId?: string) => {
			stopCamera();
			try {
				const constraints: MediaStreamConstraints = {
					video: {
						deviceId: deviceId ? { exact: deviceId } : undefined,
					},
				};
				const stream = await navigator.mediaDevices.getUserMedia(constraints);
				setHasCameraPermission(true);
				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
			} catch (error) {
				console.error('Error accessing camera:', error);
				setHasCameraPermission(false);
				toast({
					variant: 'destructive',
					title: 'Camera Access Denied',
					description:
						'Please enable camera permissions in your browser settings.',
				});
			}
		},
		[stopCamera, toast]
	);

	useEffect(() => {
		let mounted = true;
		if (activeTab === 'camera' && child && !imageData) {
			navigator.mediaDevices
				.enumerateDevices()
				.then((devices) => {
					if (!mounted) return;
					const videoInputs = devices.filter(
						(device) => device.kind === 'videoinput'
					);
					setVideoDevices(videoInputs);
					if (videoInputs.length > 0) {
						// Prefer back camera by looking for 'facing back' in the label
						const backCamera = videoInputs.find((d) =>
							d.label.toLowerCase().includes('back')
						);
						const initialDeviceId =
							backCamera?.deviceId || videoInputs[0].deviceId;
						if (selectedDeviceId !== initialDeviceId) {
							setSelectedDeviceId(initialDeviceId);
						} else {
							startCamera(initialDeviceId);
						}
					}
				})
				.catch(() => {
					/* ignore enumeration errors */
				});
		} else {
			stopCamera();
		}
		return () => {
			mounted = false;
		};
	}, [activeTab, child, imageData, startCamera, stopCamera, selectedDeviceId]);

	useEffect(() => {
		if (selectedDeviceId && activeTab === 'camera' && !imageData) {
			startCamera(selectedDeviceId);
		}
		return () => {
			if (activeTab === 'camera') {
				stopCamera();
			}
		};
	}, [selectedDeviceId, activeTab, imageData, startCamera, stopCamera]);

	const handleClose = () => {
		stopCamera();
		setImageData(null);
		onClose();
	};

	const takePhoto = () => {
		if (videoRef.current && photoRef.current) {
			const video = videoRef.current;
			const photo = photoRef.current;
			const context = photo.getContext('2d');

			const width = video.videoWidth;
			const height = video.videoHeight;

			photo.width = width;
			photo.height = height;

			if (context) {
				context.drawImage(video, 0, 0, width, height);
				const data = photo.toDataURL('image/jpeg');
				setImageData(data);
				stopCamera();
			}
		}
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setImageData(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSave = async () => {
		if (!child || !imageData) return;

		setIsSaving(true);
		try {
			await updatePhotoMutation.mutateAsync({
				childId: child.child_id,
				photoDataUrl: imageData,
			});

			toast({
				title: 'Photo Updated',
				description: `A new photo has been saved for ${child.first_name}.`,
			});

			handleClose();
		} catch (error) {
			console.error('Failed to save photo:', error);
			toast({
				title: 'Save Failed',
				description: 'Could not save the photo. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const switchCamera = () => {
		if (videoDevices.length > 1) {
			const currentIndex = videoDevices.findIndex(
				(device) => device.deviceId === selectedDeviceId
			);
			const nextIndex = (currentIndex + 1) % videoDevices.length;
			setSelectedDeviceId(videoDevices[nextIndex].deviceId);
		}
	};

	return (
		<Dialog open={!!child} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="font-headline">
						Update Photo for {child?.first_name}
					</DialogTitle>
					<DialogDescription>
						Use your camera to take a new photo or upload an existing one.
					</DialogDescription>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="camera">
							<Camera className="mr-2 h-4 w-4" />
							Camera
						</TabsTrigger>
						<TabsTrigger value="upload">
							<Upload className="mr-2 h-4 w-4" />
							Upload
						</TabsTrigger>
					</TabsList>
					<TabsContent value="camera">
						<div className="space-y-4 py-4">
							{hasCameraPermission === false && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Camera Access Required</AlertTitle>
									<AlertDescription>
										Please allow camera access in your browser to use this
										feature.
									</AlertDescription>
								</Alert>
							)}
							<div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
								{imageData ? (
									<img
										src={imageData}
										alt="Captured"
										className="w-full h-full object-cover"
									/>
								) : (
									<video
										ref={videoRef}
										className="w-full h-full object-cover"
										autoPlay
										muted
										playsInline
									/>
								)}
								<canvas ref={photoRef} className="hidden" />
							</div>
							<div className="flex gap-2">
								{imageData ? (
									<Button
										className="w-full"
										variant="outline"
										onClick={() => setImageData(null)}>
										Retake Photo
									</Button>
								) : (
									<>
										<Button
											className="w-full"
											onClick={takePhoto}
											disabled={!hasCameraPermission}>
											<Camera className="mr-2 h-4 w-4" />
											Take Photo
										</Button>
										{videoDevices.length > 1 && (
											<Button
												variant="outline"
												size="icon"
												onClick={switchCamera}
												disabled={!hasCameraPermission}>
												<RefreshCw className="h-4 w-4" />
											</Button>
										)}
									</>
								)}
							</div>
						</div>
					</TabsContent>
					<TabsContent value="upload">
						<div className="space-y-4 py-4">
							{imageData && activeTab === 'upload' ? (
								<div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden">
									<img
										src={imageData}
										alt="Uploaded preview"
										className="w-full h-full object-cover"
									/>
								</div>
							) : (
								<div className="flex items-center justify-center w-full">
									<label
										htmlFor="dropzone-file"
										className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
										<div className="flex flex-col items-center justify-center pt-5 pb-6">
											<Upload className="w-8 h-8 mb-4 text-muted-foreground" />
											<p className="mb-2 text-sm text-muted-foreground">
												<span className="font-semibold">Click to upload</span>{' '}
												or drag and drop
											</p>
											<p className="text-xs text-muted-foreground">
												PNG, JPG, or JPEG
											</p>
										</div>
										<Input
											id="dropzone-file"
											type="file"
											className="hidden"
											accept="image/png, image/jpeg"
											onChange={handleFileChange}
										/>
									</label>
								</div>
							)}

							{imageData && activeTab === 'upload' && (
								<Button
									className="w-full"
									variant="outline"
									onClick={() => setImageData(null)}>
									Clear and re-upload
								</Button>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<Button variant="ghost" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!imageData || isSaving}>
						{isSaving ? 'Saving...' : 'Save Photo'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
