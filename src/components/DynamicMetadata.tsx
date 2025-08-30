'use client';

import { useEffect } from 'react';
import { useBranding } from '@/contexts/branding-context';

export function DynamicMetadata() {
    const { settings, loading } = useBranding();

    useEffect(() => {
        if (!loading && settings.app_name) {
            // Update document title
            document.title = settings.app_name;
            
            // Update meta description if available
            if (settings.description) {
                const metaDescription = document.querySelector('meta[name="description"]');
                if (metaDescription) {
                    metaDescription.setAttribute('content', settings.description);
                } else {
                    const meta = document.createElement('meta');
                    meta.name = 'description';
                    meta.content = settings.description;
                    document.head.appendChild(meta);
                }
            }
        }
    }, [settings, loading]);

    return null; // This component only handles side effects
}