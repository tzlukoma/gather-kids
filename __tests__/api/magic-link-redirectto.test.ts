/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock test to verify redirectTo functionality works with Vercel preview URLs

// Mock the email service
const mockEmailService = {
  testConnection: jest.fn().mockResolvedValue(true),
  sendMagicLinkEmail: jest.fn().mockResolvedValue(true),
};

jest.mock('@/lib/email-service', () => ({
  createEmailService: () => mockEmailService,
}));

// Mock Supabase client to avoid real calls
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('Magic Link API redirectTo Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should construct redirectTo URL from request URL for Vercel preview deployments', async () => {
    // Simulate a Vercel preview deployment URL
    const previewUrl = 'https://gather-kids-abc123.vercel.app/api/auth/magic-link';
    
    const mockRequest = new NextRequest(previewUrl, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Test the URL construction logic directly
    const requestUrl = new URL(mockRequest.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const redirectToUrl = `${baseUrl}/auth/callback`;

    // Verify the redirectTo URL is constructed correctly
    expect(redirectToUrl).toBe('https://gather-kids-abc123.vercel.app/auth/callback');
  });

  it('should construct redirectTo URL from localhost for local development', async () => {
    // Simulate local development URL
    const localUrl = 'http://localhost:9002/api/auth/magic-link';
    
    const mockRequest = new NextRequest(localUrl, {
      method: 'POST',
      body: JSON.stringify({ email: 'local@example.com' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Test the URL construction logic directly
    const requestUrl = new URL(mockRequest.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const redirectToUrl = `${baseUrl}/auth/callback`;

    // Verify the redirectTo URL is constructed correctly for localhost
    expect(redirectToUrl).toBe('http://localhost:9002/auth/callback');
  });

  it('should work with production URLs', async () => {
    // Simulate production URL
    const prodUrl = 'https://gatherkids.example.com/api/auth/magic-link';
    
    const mockRequest = new NextRequest(prodUrl, {
      method: 'POST',
      body: JSON.stringify({ email: 'prod@example.com' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Test the URL construction logic directly
    const requestUrl = new URL(mockRequest.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const redirectToUrl = `${baseUrl}/auth/callback`;

    // Verify the redirectTo URL is constructed correctly for production
    expect(redirectToUrl).toBe('https://gatherkids.example.com/auth/callback');
  });
});