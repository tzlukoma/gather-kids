'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dbAdapter } from '@/lib/dal';
import { useAuth } from '@/contexts/auth-context';
import { isDemo } from '@/lib/authGuards';

interface UseDraftPersistenceOptions {
	formName: string;
	version?: number;
	autoSaveDelay?: number; // debounce delay in ms
	enabled?: boolean; // whether draft persistence is enabled
}

interface DraftStatus {
	isSaving: boolean;
	lastSaved: Date | null;
	error: string | null;
}

export function useDraftPersistence<T>(options: UseDraftPersistenceOptions) {
	const { formName, version = 1, autoSaveDelay = 1000, enabled = true } = options;
	const { user, loading } = useAuth();
	const [draftStatus, setDraftStatus] = useState<DraftStatus>({
		isSaving: false,
		lastSaved: null,
		error: null,
	});

	const saveTimeoutRef = useRef<NodeJS.Timeout>();
	const lastSavedDataRef = useRef<string>();

	// Generate user ID for draft scoping
	const getUserId = useCallback((): string | null => {
		// Don't try to get user ID if auth is still loading
		if (loading) {
			return null;
		}
		
		// In Supabase mode, require authenticated user (including GUEST role)
		if (!isDemo()) {
			if (user?.uid) return user.uid;
			if (user?.id) return user.id;
			// In Supabase mode, if no authenticated user, return null instead of throwing
			return null;
		}
		
		// For demo mode without a logged-in user, use a session-based ID
		if (user?.uid) return user.uid;
		if (user?.id) return user.id;
		
		if (typeof window !== 'undefined') {
			let sessionUserId = sessionStorage.getItem('draft-user-id');
			if (!sessionUserId) {
				sessionUserId = `demo-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
				sessionStorage.setItem('draft-user-id', sessionUserId);
			}
			return sessionUserId;
		}
		return 'anonymous-user';
	}, [user, loading]);

	// Load draft data
	const loadDraft = useCallback(async (): Promise<T | null> => {
		if (!enabled) return null;
		
		try {
			const userId = getUserId();
			if (!userId) {
				// No authenticated user in Supabase mode, skip loading
				return null;
			}
			const draftData = await dbAdapter.getDraft(formName, userId);
			return draftData as T | null;
		} catch (error) {
			console.error('Failed to load draft:', error);
			setDraftStatus(prev => ({ ...prev, error: 'Failed to load draft' }));
			return null;
		}
	}, [formName, getUserId, enabled]);

	// Save draft data with debouncing
	const saveDraft = useCallback(async (data: T, immediate = false) => {
		if (!enabled) return;
		
		const userId = getUserId();
		if (!userId) {
			// No authenticated user in Supabase mode, skip saving
			return;
		}
		
		const dataString = JSON.stringify(data);
		
		// Skip saving if data hasn't changed
		if (lastSavedDataRef.current === dataString && !immediate) {
			return;
		}

		const performSave = async () => {
			try {
				setDraftStatus(prev => ({ ...prev, isSaving: true, error: null }));
				await dbAdapter.saveDraft(formName, userId, data, version);
				lastSavedDataRef.current = dataString;
				setDraftStatus(prev => ({
					...prev,
					isSaving: false,
					lastSaved: new Date(),
					error: null,
				}));
			} catch (error) {
				console.error('Failed to save draft:', error);
				setDraftStatus(prev => ({
					...prev,
					isSaving: false,
					error: 'Failed to save draft',
				}));
			}
		};

		if (immediate) {
			// Clear any pending saves and save immediately
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			await performSave();
		} else {
			// Debounce the save
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			saveTimeoutRef.current = setTimeout(performSave, autoSaveDelay);
		}
	}, [formName, getUserId, version, autoSaveDelay, enabled]);

	// Clear draft
	const clearDraft = useCallback(async () => {
		if (!enabled) return;
		
		try {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
			const userId = getUserId();
			if (!userId) {
				// No authenticated user in Supabase mode, skip clearing
				return;
			}
			await dbAdapter.clearDraft(formName, userId);
			lastSavedDataRef.current = undefined;
			setDraftStatus(prev => ({
				...prev,
				lastSaved: null,
				error: null,
			}));
		} catch (error) {
			console.error('Failed to clear draft:', error);
			setDraftStatus(prev => ({ ...prev, error: 'Failed to clear draft' }));
		}
	}, [formName, getUserId, enabled]);

	// Save on page unload/visibility change
	useEffect(() => {
		if (!enabled) return;
		
		const handleBeforeUnload = () => {
			// Force immediate save on page unload
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};

		const handleVisibilityChange = () => {
			if (document.hidden && saveTimeoutRef.current) {
				// Page is being backgrounded, trigger immediate save
				clearTimeout(saveTimeoutRef.current);
				// Note: We can't await here, but the save should still trigger
				if (lastSavedDataRef.current) {
					const userId = getUserId();
					const lastData = lastSavedDataRef.current;
					if (lastData) {
						dbAdapter.saveDraft(formName, userId, JSON.parse(lastData), version);
					}
				}
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [formName, getUserId, version, enabled]);

	return {
		loadDraft,
		saveDraft,
		clearDraft,
		draftStatus,
	};
}