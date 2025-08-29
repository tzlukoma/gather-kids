'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useBranding } from '@/contexts/branding-context';
import { AuthRole } from '@/lib/auth-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Youtube, Instagram, Palette } from 'lucide-react';
import { saveBrandingSettings, getBrandingSettings } from '@/lib/dal';

interface BrandingFormData {
    app_name: string;
    description: string;
    logo_url: string;
    use_logo_only: boolean;
    youtube_url: string;
    instagram_url: string;
}

export default function BrandingPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { settings, refreshSettings } = useBranding();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [formData, setFormData] = useState<BrandingFormData>({
        app_name: '',
        description: '',
        logo_url: '',
        use_logo_only: false,
        youtube_url: '',
        instagram_url: '',
    });

    useEffect(() => {
        if (!authLoading && user) {
            if (user?.metadata?.role !== AuthRole.ADMIN) {
                router.push('/dashboard');
            } else {
                setIsAuthorized(true);
            }
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (settings) {
            setFormData({
                app_name: settings.app_name || '',
                description: settings.description || '',
                logo_url: settings.logo_url || '',
                use_logo_only: settings.use_logo_only || false,
                youtube_url: settings.youtube_url || '',
                instagram_url: settings.instagram_url || '',
            });
        }
    }, [settings]);

    const handleInputChange = (field: keyof BrandingFormData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: 'Invalid File Type',
                    description: 'Please select an image file.',
                    variant: 'destructive',
                });
                return;
            }

            // Validate file size (500KB limit for demo mode)
            if (file.size > 500 * 1024) {
                toast({
                    title: 'File Too Large',
                    description: 'Please select an image smaller than 500KB.',
                    variant: 'destructive',
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                handleInputChange('logo_url', result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate that if "Use Logo Only" is enabled, a logo must be provided
        if (formData.use_logo_only && !formData.logo_url) {
            toast({
                title: 'Logo Required',
                description: 'When "Use Logo Only" is enabled, a logo file must be uploaded.',
                variant: 'destructive',
            });
            return;
        }
        
        setLoading(true);

        try {
            await saveBrandingSettings('default', {
                app_name: formData.app_name || undefined,
                description: formData.description || undefined,
                logo_url: formData.logo_url || undefined,
                use_logo_only: formData.use_logo_only || undefined,
                youtube_url: formData.youtube_url || undefined,
                instagram_url: formData.instagram_url || undefined,
            });

            await refreshSettings();

            toast({
                title: 'Settings Saved',
                description: 'Branding settings have been updated successfully.',
            });
        } catch (error) {
            console.error('Failed to save branding settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to save branding settings. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFormData({
            app_name: 'gatherKids',
            description: "The simple, secure, and smart way to manage your children's ministry. Streamline check-ins, track attendance, and keep your community connected.",
            logo_url: '',
            use_logo_only: false,
            youtube_url: '',
            instagram_url: '',
        });
    };

    if (authLoading || !isAuthorized) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Palette className="h-8 w-8" />
                        Branding & Private Label
                    </h1>
                    <p className="text-muted-foreground">
                        Customize your app's appearance and branding to match your organization.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* App Identity Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>App Identity</CardTitle>
                        <CardDescription>
                            Configure your app's name and description that appears throughout the interface.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="app_name">App Name</Label>
                            <Input
                                id="app_name"
                                type="text"
                                placeholder="gatherKids"
                                value={formData.app_name}
                                onChange={(e) => handleInputChange('app_name', e.target.value)}
                                className="mt-1"
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                This name will appear in the navigation and page titles.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="description">Description / Tagline</Label>
                            <Textarea
                                id="description"
                                placeholder="The simple, secure, and smart way to manage your children's ministry..."
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                className="mt-1"
                                rows={3}
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                This description appears on the home page and in marketing materials.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Logo Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            Logo
                        </CardTitle>
                        <CardDescription>
                            Upload a custom logo to replace the default cross icon. For demo mode, the image is stored locally.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="logo_upload">Upload Logo</Label>
                            <div className="mt-1 flex items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        id="logo_upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('logo_upload')?.click()}
                                        className="w-full justify-start"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Choose Image File
                                    </Button>
                                </div>
                                {formData.logo_url && (
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 border border-border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                                            {formData.logo_url.startsWith('data:') ? (
                                                <img
                                                    src={formData.logo_url}
                                                    alt="Logo preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Recommended: 200x200px or larger, PNG/JPG format, max 500KB.
                            </p>
                        </div>

                        {formData.logo_url && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleInputChange('logo_url', '')}
                            >
                                Remove Logo
                            </Button>
                        )}

                        {/* Use Logo Only Option */}
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="use_logo_only"
                                    checked={formData.use_logo_only}
                                    onCheckedChange={(checked) => 
                                        handleInputChange('use_logo_only', checked === true)
                                    }
                                />
                                <Label
                                    htmlFor="use_logo_only"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Use Logo Only
                                </Label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                When enabled, only the logo will be displayed in headers (no app name text). A logo file is required when this option is selected.
                            </p>
                            {formData.use_logo_only && !formData.logo_url && (
                                <p className="text-sm text-destructive font-medium">
                                    ⚠️ A logo file is required when "Use Logo Only" is enabled.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Social Media Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Social Media Links</CardTitle>
                        <CardDescription>
                            Add links to your organization's social media profiles. These will appear on the home page when provided.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="youtube_url" className="flex items-center gap-2">
                                <Youtube className="h-4 w-4" />
                                YouTube URL
                            </Label>
                            <Input
                                id="youtube_url"
                                type="url"
                                placeholder="https://youtube.com/@yourchannel"
                                value={formData.youtube_url}
                                onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="instagram_url" className="flex items-center gap-2">
                                <Instagram className="h-4 w-4" />
                                Instagram URL
                            </Label>
                            <Input
                                id="instagram_url"
                                type="url"
                                placeholder="https://instagram.com/yourprofile"
                                value={formData.instagram_url}
                                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                {/* Form Actions */}
                <div className="flex items-center justify-between pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={loading}
                    >
                        Reset to Defaults
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}