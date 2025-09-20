'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Upload, ZoomIn, ZoomOut, RotateCw, X, Save, Camera, AlertTriangle, RefreshCw } from 'lucide-react';

interface SquareCropperModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (croppedBlob: Blob, croppedDataUrl: string) => Promise<void>;
	title: string;
	description?: string;
	acceptedTypes?: string[];
	maxFileSize?: number; // in bytes
	outputSize?: number; // output dimensions in pixels
}

interface CropData {
	x: number;
	y: number;
	size: number;
	scale: number;
	rotation: number;
}

// EXIF orientation values
const EXIF_ORIENTATIONS = {
	1: 0, // Normal
	2: 0, // Flip horizontal
	3: 180, // Rotate 180°
	4: 0, // Flip vertical
	5: 0, // Flip horizontal + rotate 90° CW
	6: 90, // Rotate 90° CW
	7: 0, // Flip horizontal + rotate 90° CCW
	8: 270, // Rotate 90° CCW
} as const;

export function SquareCropperModal({
	isOpen,
	onClose,
	onSave,
	title,
	description,
	acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
	maxFileSize = 10 * 1024 * 1024, // 10MB
	outputSize = 512,
}: SquareCropperModalProps) {
	const [activeTab, setActiveTab] = useState('camera');
	const [file, setFile] = useState<File | null>(null);
	const [imageUrl, setImageUrl] = useState<string>('');
	const [crop, setCrop] = useState<CropData>({
		x: 0,
		y: 0,
		size: 0,
		scale: 1,
		rotation: 0,
	});
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0, cropX: 0, cropY: 0 });
	const [isSaving, setIsSaving] = useState(false);
	const [progress, setProgress] = useState(0);

	// Camera-specific states
	const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	
	// Camera-specific refs
	const videoRef = useRef<HTMLVideoElement>(null);
	const photoRef = useRef<HTMLCanvasElement>(null);
	const streamRef = useRef<MediaStream | null>(null);

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setActiveTab('camera');
			setFile(null);
			setImageUrl('');
			setCrop({ x: 0, y: 0, size: 0, scale: 1, rotation: 0 });
			setProgress(0);
			stopCamera();
		}
	}, [isOpen]);

	// Camera functions
	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop());
			streamRef.current = null;
		}
	}, []);

	const startCamera = useCallback(async (deviceId?: string) => {
		stopCamera();
		try {
			const constraints: MediaStreamConstraints = {
				video: {
					deviceId: deviceId ? { exact: deviceId } : undefined
				}
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
				description: 'Please enable camera permissions in your browser settings.',
			});
		}
	}, [stopCamera, toast]);

	// Camera initialization effect
	useEffect(() => {
		let mounted = true;
		if (activeTab === 'camera' && isOpen && !imageUrl) {
			navigator.mediaDevices.enumerateDevices().then(devices => {
				if (!mounted) return;
				const videoInputs = devices.filter(device => device.kind === 'videoinput');
				setVideoDevices(videoInputs);
				if (videoInputs.length > 0) {
					// Prefer back camera by looking for 'facing back' in the label
					const backCamera = videoInputs.find(d => d.label.toLowerCase().includes('back'));
					const initialDeviceId = backCamera?.deviceId || videoInputs[0].deviceId;
					if (selectedDeviceId !== initialDeviceId) {
						setSelectedDeviceId(initialDeviceId);
					} else {
						startCamera(initialDeviceId);
					}
				}
			}).catch(() => {
				/* ignore enumeration errors */
			});
		} else {
			stopCamera();
		}
		return () => { 
			mounted = false; 
		};
	}, [activeTab, isOpen, imageUrl, startCamera, stopCamera, selectedDeviceId]);

	// Camera device selection effect
	useEffect(() => {
		if (selectedDeviceId && activeTab === 'camera' && !imageUrl) {
			startCamera(selectedDeviceId);
		}
		return () => {
			if (activeTab === 'camera') {
				stopCamera();
			}
		};
	}, [selectedDeviceId, activeTab, imageUrl, startCamera, stopCamera]);

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
				const dataUrl = photo.toDataURL('image/jpeg');
				
				// Create a file-like object for consistency with file upload path
				fetch(dataUrl)
					.then(res => res.blob())
					.then(blob => {
						const file = new File([blob], 'camera-photo.jpg', {
							type: 'image/jpeg',
							lastModified: Date.now(),
						});
						setFile(file);
						handleFileSelect(file, dataUrl);
					});
				
				stopCamera();
			}
		}
	};

	const switchCamera = () => {
		if (videoDevices.length > 1) {
			const currentIndex = videoDevices.findIndex(device => device.deviceId === selectedDeviceId);
			const nextIndex = (currentIndex + 1) % videoDevices.length;
			setSelectedDeviceId(videoDevices[nextIndex].deviceId);
		}
	};

	// Auto-rotate based on EXIF data
	const getExifRotation = async (file: File): Promise<number> => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const arrayBuffer = e.target?.result as ArrayBuffer;
				const dataView = new DataView(arrayBuffer);
				
				// Check for EXIF marker
				if (dataView.getUint16(0) !== 0xFFD8) {
					resolve(0);
					return;
				}

				let offset = 2;
				let marker;
				let little = false;

				while (offset < dataView.byteLength) {
					marker = dataView.getUint16(offset);
					if (marker === 0xFFE1) {
						// EXIF marker found
						const exifData = dataView.getUint32(offset + 4);
						if (exifData === 0x45786966) { // "Exif"
							const tiffOffset = offset + 10;
							const byteOrder = dataView.getUint16(tiffOffset);
							little = byteOrder === 0x4949; // Intel byte order
							
							// Find orientation tag
							const ifdOffset = tiffOffset + dataView.getUint32(tiffOffset + 4, little);
							const tags = dataView.getUint16(ifdOffset, little);
							
							for (let i = 0; i < tags; i++) {
								const tagOffset = ifdOffset + 2 + i * 12;
								const tag = dataView.getUint16(tagOffset, little);
								
								if (tag === 0x0112) { // Orientation tag
									const orientation = dataView.getUint16(tagOffset + 8, little);
									resolve(EXIF_ORIENTATIONS[orientation as keyof typeof EXIF_ORIENTATIONS] || 0);
									return;
								}
							}
						}
						break;
					}
					offset += 2 + dataView.getUint16(offset + 2);
				}
				resolve(0);
			};
			reader.readAsArrayBuffer(file);
		});
	};

	const handleFileSelect = async (selectedFile: File, existingDataUrl?: string) => {
		// Validate file type
		if (!acceptedTypes.includes(selectedFile.type)) {
			toast({
				title: 'Invalid File Type',
				description: `Please select a valid image file (${acceptedTypes.join(', ')})`,
				variant: 'destructive',
			});
			return;
		}

		// Validate file size
		if (selectedFile.size > maxFileSize) {
			toast({
				title: 'File Too Large',
				description: `File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`,
				variant: 'destructive',
			});
			return;
		}

		setFile(selectedFile);
		setProgress(10);

		try {
			// Get EXIF rotation
			const exifRotation = await getExifRotation(selectedFile);
			
			// Use existing data URL (from camera) or create new one
			const url = existingDataUrl || URL.createObjectURL(selectedFile);
			setImageUrl(url);
			setProgress(30);

			// Wait for image to load to calculate initial crop
			const img = new Image();
			img.onload = () => {
				const containerWidth = 400; // Fixed container width
				const containerHeight = 400; // Fixed container height
				
				// Calculate scale to fit image in container
				const scaleX = containerWidth / img.naturalWidth;
				const scaleY = containerHeight / img.naturalHeight;
				const initialScale = Math.min(scaleX, scaleY);
				
				// Calculate crop size (square that fits in the image)
				const maxCropSize = Math.min(img.naturalWidth, img.naturalHeight) * initialScale;
				
				// Center the crop
				const x = (containerWidth - maxCropSize) / 2;
				const y = (containerHeight - maxCropSize) / 2;

				setCrop({
					x,
					y,
					size: maxCropSize,
					scale: initialScale,
					rotation: exifRotation,
				});
				setProgress(100);
			};
			img.src = url;
		} catch (error) {
			console.error('Error processing image:', error);
			toast({
				title: 'Error',
				description: 'Failed to process the image. Please try again.',
				variant: 'destructive',
			});
			setProgress(0);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			handleFileSelect(selectedFile);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			handleFileSelect(droppedFile);
		}
	};

	// Crop area mouse/touch handlers
	const handleCropMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		setDragStart({
			x: e.clientX,
			y: e.clientY,
			cropX: crop.x,
			cropY: crop.y,
		});
	};

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDragging || !containerRef.current) return;

		const deltaX = e.clientX - dragStart.x;
		const deltaY = e.clientY - dragStart.y;
		const containerRect = containerRef.current.getBoundingClientRect();
		
		const newX = Math.max(0, Math.min(dragStart.cropX + deltaX, containerRect.width - crop.size));
		const newY = Math.max(0, Math.min(dragStart.cropY + deltaY, containerRect.height - crop.size));

		setCrop(prev => ({ ...prev, x: newX, y: newY }));
	}, [isDragging, dragStart, crop.size]);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Add global mouse event listeners
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Zoom handlers
	const handleZoomIn = () => {
		setCrop(prev => ({
			...prev,
			scale: Math.min(prev.scale * 1.2, 3),
		}));
	};

	const handleZoomOut = () => {
		setCrop(prev => ({
			...prev,
			scale: Math.max(prev.scale / 1.2, 0.1),
		}));
	};

	// Rotate handler
	const handleRotate = () => {
		setCrop(prev => ({
			...prev,
			rotation: (prev.rotation + 90) % 360,
		}));
	};

	// Keyboard handlers for accessibility
	const handleKeyDown = (e: React.KeyboardEvent) => {
		const step = 5;
		switch (e.key) {
			case 'ArrowLeft':
				e.preventDefault();
				setCrop(prev => ({ ...prev, x: Math.max(0, prev.x - step) }));
				break;
			case 'ArrowRight':
				e.preventDefault();
				setCrop(prev => ({ ...prev, x: Math.min(400 - prev.size, prev.x + step) }));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setCrop(prev => ({ ...prev, y: Math.max(0, prev.y - step) }));
				break;
			case 'ArrowDown':
				e.preventDefault();
				setCrop(prev => ({ ...prev, y: Math.min(400 - prev.size, prev.y + step) }));
				break;
			case '+':
			case '=':
				e.preventDefault();
				handleZoomIn();
				break;
			case '-':
			case '_':
				e.preventDefault();
				handleZoomOut();
				break;
		}
	};

	// Generate cropped image
	const generateCroppedImage = async (): Promise<{ blob: Blob; dataUrl: string }> => {
		if (!imageRef.current || !canvasRef.current) {
			throw new Error('Image or canvas not available');
		}

		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Canvas context not available');
		}

		canvas.width = outputSize;
		canvas.height = outputSize;

		// Save context
		ctx.save();

		// Apply rotation
		if (crop.rotation !== 0) {
			ctx.translate(outputSize / 2, outputSize / 2);
			ctx.rotate((crop.rotation * Math.PI) / 180);
			ctx.translate(-outputSize / 2, -outputSize / 2);
		}

		// Calculate source coordinates
		const img = imageRef.current;
		const sourceSize = crop.size / crop.scale;
		const sourceX = crop.x / crop.scale;
		const sourceY = crop.y / crop.scale;

		// Draw cropped image
		ctx.drawImage(
			img,
			sourceX,
			sourceY,
			sourceSize,
			sourceSize,
			0,
			0,
			outputSize,
			outputSize
		);

		// Restore context
		ctx.restore();

		// Convert to blob (prefer WebP, fallback to JPEG)
		const blob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => {
					if (result) {
						resolve(result);
					} else {
						// Fallback to JPEG if WebP fails
						canvas.toBlob(
							(jpegResult) => {
								if (jpegResult) {
									resolve(jpegResult);
								} else {
									reject(new Error('Failed to create image blob'));
								}
							},
							'image/jpeg',
							0.8
						);
					}
				},
				'image/webp',
				0.85
			);
		});

		const dataUrl = canvas.toDataURL('image/webp', 0.85);
		
		return { blob, dataUrl };
	};

	const handleSave = async () => {
		if (!file || !imageRef.current) return;

		setIsSaving(true);
		try {
			const { blob, dataUrl } = await generateCroppedImage();
			await onSave(blob, dataUrl);
			onClose();
		} catch (error) {
			console.error('Error saving cropped image:', error);
			toast({
				title: 'Error',
				description: 'Failed to save the cropped image. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleRemove = () => {
		stopCamera();
		onClose();
	};

	const handleRetake = () => {
		setFile(null);
		setImageUrl('');
		setCrop({ x: 0, y: 0, size: 0, scale: 1, rotation: 0 });
		setProgress(0);
		
		// Restart camera if on camera tab
		if (activeTab === 'camera' && selectedDeviceId) {
			startCamera(selectedDeviceId);
		}
	};

	const handleTabChange = (newTab: string) => {
		setActiveTab(newTab);
		// Reset image data when switching tabs
		setFile(null);
		setImageUrl('');
		setCrop({ x: 0, y: 0, size: 0, scale: 1, rotation: 0 });
		setProgress(0);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleRemove}>
			<DialogContent className="sm:max-w-md" aria-describedby="cropper-description">
				<DialogHeader>
					<DialogTitle className="font-headline">{title}</DialogTitle>
					{description && (
						<DialogDescription id="cropper-description">
							{description}
						</DialogDescription>
					)}
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
						<div className="space-y-4">
							{hasCameraPermission === false && (
								<Alert variant="destructive">
									<AlertTriangle className="h-4 w-4" />
									<AlertTitle>Camera Access Required</AlertTitle>
									<AlertDescription>
										Please allow camera access in your browser to use this feature.
									</AlertDescription>
								</Alert>
							)}

							{/* Camera preview or captured image */}
							{!imageUrl ? (
								<div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
									<video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
									<canvas ref={photoRef} className="hidden" />
								</div>
							) : null}

							{/* Camera controls */}
							{!imageUrl && (
								<div className="flex gap-2">
									<Button 
										className="flex-1" 
										onClick={takePhoto} 
										disabled={!hasCameraPermission}
									>
										<Camera className="mr-2 h-4 w-4" />
										Take Photo
									</Button>
									{videoDevices.length > 1 && (
										<Button 
											variant="outline" 
											size="icon" 
											onClick={switchCamera} 
											disabled={!hasCameraPermission}
										>
											<RefreshCw className="h-4 w-4" />
										</Button>
									)}
								</div>
							)}

							{/* Show retake button if image captured */}
							{imageUrl && (
								<Button className="w-full" variant="outline" onClick={handleRetake}>
									Retake Photo
								</Button>
							)}
						</div>
					</TabsContent>

					<TabsContent value="upload">
						<div className="space-y-4">
							{/* File upload area */}
							{!file && (
								<div
									className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
									onDragOver={handleDragOver}
									onDrop={handleDrop}
									onClick={() => fileInputRef.current?.click()}
								>
									<Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
									<p className="text-sm text-muted-foreground">
										<span className="font-medium">Click to upload</span> or drag and drop
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										{acceptedTypes.map(type => type.split('/')[1]).join(', ')} up to {Math.round(maxFileSize / (1024 * 1024))}MB
									</p>
									<input
										ref={fileInputRef}
										type="file"
										accept={acceptedTypes.join(',')}
										onChange={handleFileChange}
										className="hidden"
									/>
								</div>
							)}

							{/* Clear and re-upload button */}
							{file && (
								<Button className="w-full" variant="outline" onClick={handleRetake}>
									Clear and re-upload
								</Button>
							)}
						</div>
					</TabsContent>
				</Tabs>

				{/* Loading progress */}
				{file && progress < 100 && (
					<div className="space-y-2">
						<p className="text-sm text-muted-foreground">Processing image...</p>
						<Progress value={progress} className="w-full" />
					</div>
				)}

				{/* Image cropper */}
				{file && progress === 100 && imageUrl && (
					<div className="space-y-4">
						{/* Crop area */}
						<div
							ref={containerRef}
							className="relative w-full h-96 bg-black rounded-lg overflow-hidden"
							tabIndex={0}
							onKeyDown={handleKeyDown}
							role="img"
							aria-label="Image cropping area. Use arrow keys to move, +/- to zoom"
						>
							<img
								ref={imageRef}
								src={imageUrl}
								alt="Preview"
								className="absolute inset-0 w-full h-full object-contain"
								style={{
									transform: `scale(${crop.scale}) rotate(${crop.rotation}deg)`,
								}}
							/>
							
							{/* Crop overlay */}
							<div
								className="absolute border-2 border-white shadow-lg cursor-move bg-black/20"
								style={{
									left: crop.x,
									top: crop.y,
									width: crop.size,
									height: crop.size,
								}}
								onMouseDown={handleCropMouseDown}
								role="button"
								tabIndex={-1}
								aria-label="Crop area - drag to reposition"
							>
								{/* Corner handles */}
								<div className="absolute top-0 left-0 w-3 h-3 bg-white border border-gray-400"></div>
								<div className="absolute top-0 right-0 w-3 h-3 bg-white border border-gray-400"></div>
								<div className="absolute bottom-0 left-0 w-3 h-3 bg-white border border-gray-400"></div>
								<div className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400"></div>
							</div>
						</div>

						{/* Controls */}
						<div className="flex justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleZoomOut}
								disabled={crop.scale <= 0.1}
								aria-label="Zoom out"
							>
								<ZoomOut className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleZoomIn}
								disabled={crop.scale >= 3}
								aria-label="Zoom in"
							>
								<ZoomIn className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={handleRotate}
								aria-label="Rotate 90 degrees"
							>
								<RotateCw className="h-4 w-4" />
							</Button>
							{activeTab === 'upload' && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => fileInputRef.current?.click()}
									aria-label="Select different image"
								>
									<Upload className="h-4 w-4" />
								</Button>
							)}
						</div>

						<p className="text-xs text-muted-foreground text-center">
							Use arrow keys to move crop area, +/- keys to zoom
						</p>
					</div>
				)}

				{/* Hidden canvas for image processing */}
				<canvas ref={canvasRef} style={{ display: 'none' }} />

				<DialogFooter>
					<Button variant="ghost" onClick={handleRemove} disabled={isSaving}>
						<X className="h-4 w-4 mr-2" />
						Cancel
					</Button>
					<Button 
						onClick={handleSave} 
						disabled={!file || progress < 100 || isSaving}
						aria-label="Save cropped image"
					>
						{isSaving ? (
							'Saving...'
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Save Photo
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}