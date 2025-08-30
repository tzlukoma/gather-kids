/**
 * Enhanced PKCE storage utilities for cross-tab magic link support
 * This module provides utilities to manually manage PKCE storage for Supabase auth
 */

export interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  email: string;
  requestedAt: string;
  redirectTo: string;
  userAgent: string;
}

const PKCE_STORAGE_KEY = 'gatherKids-pkce-data';
const PKCE_EXPIRY_HOURS = 1; // Magic links expire after 1 hour

/**
 * Store PKCE data in localStorage for cross-tab persistence
 */
export function storePKCEData(data: PKCEData): void {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PKCE_EXPIRY_HOURS);
    
    const storageData = {
      ...data,
      expiresAt: expiresAt.toISOString(),
      storedAt: new Date().toISOString()
    };
    
    localStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(storageData));
    
    console.log('Manual PKCE storage - stored data:', {
      email: data.email,
      hasCodeVerifier: !!data.codeVerifier,
      verifierLength: data.codeVerifier?.length,
      expiresAt: storageData.expiresAt,
      key: PKCE_STORAGE_KEY
    });
  } catch (error) {
    console.error('Failed to store PKCE data:', error);
  }
}

/**
 * Retrieve PKCE data from localStorage with expiry check
 */
export function retrievePKCEData(): PKCEData | null {
  try {
    const stored = localStorage.getItem(PKCE_STORAGE_KEY);
    if (!stored) {
      console.log('Manual PKCE storage - no data found');
      return null;
    }
    
    const data = JSON.parse(stored);
    const expiresAt = new Date(data.expiresAt);
    const now = new Date();
    
    if (now > expiresAt) {
      console.log('Manual PKCE storage - data expired, removing');
      localStorage.removeItem(PKCE_STORAGE_KEY);
      return null;
    }
    
    console.log('Manual PKCE storage - retrieved valid data:', {
      email: data.email,
      hasCodeVerifier: !!data.codeVerifier,
      verifierLength: data.codeVerifier?.length,
      age: Math.round((now.getTime() - new Date(data.storedAt).getTime()) / 1000 / 60), // minutes
      expiresIn: Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60) // minutes
    });
    
    return data;
  } catch (error) {
    console.error('Failed to retrieve PKCE data:', error);
    localStorage.removeItem(PKCE_STORAGE_KEY);
    return null;
  }
}

/**
 * Clear PKCE data from localStorage
 */
export function clearPKCEData(): void {
  try {
    localStorage.removeItem(PKCE_STORAGE_KEY);
    console.log('Manual PKCE storage - cleared data');
  } catch (error) {
    console.error('Failed to clear PKCE data:', error);
  }
}

/**
 * Generate a cryptographically secure code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate code challenge from code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}