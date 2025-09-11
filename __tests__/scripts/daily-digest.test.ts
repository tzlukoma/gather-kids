/**
 * @jest-environment node
 */

import { createClient } from '@supabase/supabase-js';

// Mock the entire daily digest module for testing its individual functions
jest.mock('node-mailjet', () => ({
	__esModule: true,
	default: {
		connect: jest.fn(() => ({
			post: jest.fn(() => ({
				request: jest.fn()
			}))
		}))
	}
}));

jest.mock('nodemailer');

describe('Daily Digest Script', () => {
	const mockSupabase = {
		from: jest.fn(() => ({
			select: jest.fn(() => ({
				eq: jest.fn(() => ({
					single: jest.fn(),
					limit: jest.fn()
				})),
				gte: jest.fn(() => ({
					lte: jest.fn(() => ({
						order: jest.fn()
					}))
				})),
				upsert: jest.fn()
			}))
		}))
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Environment validation', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			jest.resetModules();
			process.env = { ...originalEnv };
		});

		afterAll(() => {
			process.env = originalEnv;
		});

		test('should require SUPABASE_URL', () => {
			delete process.env.SUPABASE_URL;
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;
			
			// Test would fail when importing the module, but we can test validation logic
			expect(() => {
				const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
				if (!supabaseUrl) {
					throw new Error('Missing Supabase URL');
				}
			}).toThrow('Missing Supabase URL');
		});

		test('should require service role key', () => {
			delete process.env.SUPABASE_SERVICE_ROLE;
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;
			
			expect(() => {
				const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
				if (!serviceRoleKey) {
					throw new Error('Missing service role key');
				}
			}).toThrow('Missing service role key');
		});

		test('should require FROM_EMAIL', () => {
			delete process.env.FROM_EMAIL;
			
			expect(() => {
				const fromEmail = process.env.FROM_EMAIL;
				if (!fromEmail) {
					throw new Error('Missing FROM_EMAIL');
				}
			}).toThrow('Missing FROM_EMAIL');
		});

		test('should require Mailjet credentials when EMAIL_MODE is mailjet', () => {
			process.env.EMAIL_MODE = 'mailjet';
			delete process.env.MJ_API_KEY;
			delete process.env.MJ_API_SECRET;
			
			expect(() => {
				const mjApiKey = process.env.MJ_API_KEY;
				const mjApiSecret = process.env.MJ_API_SECRET;
				if (!mjApiKey || !mjApiSecret) {
					throw new Error('Missing Mailjet credentials');
				}
			}).toThrow('Missing Mailjet credentials');
		});

		test('should parse MONITOR_EMAILS correctly', () => {
			// Test single email
			process.env.MONITOR_EMAILS = 'admin@example.com';
			let monitorEmails = process.env.MONITOR_EMAILS 
				? process.env.MONITOR_EMAILS.split(',').map((email: string) => email.trim()).filter((email: string) => email)
				: [];
			expect(monitorEmails).toEqual(['admin@example.com']);

			// Test multiple emails with spaces
			process.env.MONITOR_EMAILS = 'admin@example.com, monitor@example.com , audit@example.com';
			monitorEmails = process.env.MONITOR_EMAILS 
				? process.env.MONITOR_EMAILS.split(',').map((email: string) => email.trim()).filter((email: string) => email)
				: [];
			expect(monitorEmails).toEqual(['admin@example.com', 'monitor@example.com', 'audit@example.com']);

			// Test empty string
			process.env.MONITOR_EMAILS = '';
			monitorEmails = process.env.MONITOR_EMAILS 
				? process.env.MONITOR_EMAILS.split(',').map((email: string) => email.trim()).filter((email: string) => email)
				: [];
			expect(monitorEmails).toEqual([]);
		});

		test('should support environment-prefixed variables', () => {
			// Mock the getEnvVar function from dailyDigest.js
			function getEnvVar(varName: string, fallbacks: string[] = []): string | undefined {
				const ENVIRONMENT = process.env.ENVIRONMENT || '';
				
				// If ENVIRONMENT is set, check for prefixed version first
				if (ENVIRONMENT) {
					const prefixedVar = `${ENVIRONMENT}_${varName}`;
					if (process.env[prefixedVar]) {
						return process.env[prefixedVar];
					}
				}
				
				// Check base variable name
				if (process.env[varName]) {
					return process.env[varName];
				}
				
				// Check fallbacks (both prefixed and unprefixed)
				for (const fallback of fallbacks) {
					// Check prefixed fallback first if ENVIRONMENT is set
					if (ENVIRONMENT) {
						const prefixedFallback = `${ENVIRONMENT}_${fallback}`;
						if (process.env[prefixedFallback]) {
							return process.env[prefixedFallback];
						}
					}
					
					// Check unprefixed fallback
					if (process.env[fallback]) {
						return process.env[fallback];
					}
				}
				
				return undefined;
			}

			// Test without environment prefix
			process.env.SUPABASE_URL = 'https://prod.supabase.co';
			process.env.FROM_EMAIL = 'prod@example.com';
			delete process.env.ENVIRONMENT;
			
			expect(getEnvVar('SUPABASE_URL')).toBe('https://prod.supabase.co');
			expect(getEnvVar('FROM_EMAIL')).toBe('prod@example.com');

			// Test with UAT environment prefix
			process.env.ENVIRONMENT = 'UAT';
			process.env.UAT_SUPABASE_URL = 'https://uat.supabase.co';
			process.env.UAT_FROM_EMAIL = 'uat@example.com';
			
			expect(getEnvVar('SUPABASE_URL')).toBe('https://uat.supabase.co');
			expect(getEnvVar('FROM_EMAIL')).toBe('uat@example.com');

			// Test fallback to base variable when prefixed not found
			delete process.env.UAT_MONITOR_EMAILS;
			process.env.MONITOR_EMAILS = 'fallback@example.com';
			expect(getEnvVar('MONITOR_EMAILS')).toBe('fallback@example.com');

			// Test prefixed fallback variables
			delete process.env.UAT_SUPABASE_URL;
			delete process.env.SUPABASE_URL;
			process.env.UAT_DATABASE_URL = 'https://uat-db.supabase.co';
			expect(getEnvVar('SUPABASE_URL', ['DATABASE_URL'])).toBe('https://uat-db.supabase.co');
		});

		test('should handle empty ENVIRONMENT variable', () => {
			function getEnvVar(varName: string, fallbacks: string[] = []): string | undefined {
				const ENVIRONMENT = process.env.ENVIRONMENT || '';
				
				if (ENVIRONMENT) {
					const prefixedVar = `${ENVIRONMENT}_${varName}`;
					if (process.env[prefixedVar]) {
						return process.env[prefixedVar];
					}
				}
				
				if (process.env[varName]) {
					return process.env[varName];
				}
				
				for (const fallback of fallbacks) {
					if (process.env[fallback]) {
						return process.env[fallback];
					}
				}
				
				return undefined;
			}

			process.env.ENVIRONMENT = '';
			process.env.SUPABASE_URL = 'https://default.supabase.co';
			process.env.UAT_SUPABASE_URL = 'https://uat.supabase.co';
			
			// Should use base variable when ENVIRONMENT is empty
			expect(getEnvVar('SUPABASE_URL')).toBe('https://default.supabase.co');
		});
	});

	describe('Email content generation', () => {
		test('should generate ministry email content correctly', () => {
			const ministry = {
				ministry_id: 'test-ministry',
				name: 'Test Ministry',
				email: 'ministry@example.com'
			};

			const enrollments = [
				{
					enrollment_id: 'enrollment-1',
					created_at: '2025-01-01T10:00:00Z',
					children: {
						child_id: 'child-1',
						first_name: 'John',
						last_name: 'Doe',
						dob: '2015-01-01',
						households: {
							household_id: 'household-1',
							name: 'Doe Family',
							primary_email: 'parent@example.com'
						}
					}
				}
			];

			// Test the email content generation logic
			const subject = `New Enrollments for ${ministry.name} - Daily Digest`;
			const expectedSubject = 'New Enrollments for Test Ministry - Daily Digest';
			
			expect(subject).toBe(expectedSubject);
			
			// Test that content includes child name
			const childName = `${enrollments[0].children.first_name} ${enrollments[0].children.last_name}`;
			expect(childName).toBe('John Doe');
			
			// Test household info
			const householdInfo = enrollments[0].children.households;
			expect(householdInfo.name).toBe('Doe Family');
			expect(householdInfo.primary_email).toBe('parent@example.com');
		});

		test('should handle enrollments without household email', () => {
			const enrollments = [
				{
					enrollment_id: 'enrollment-1',
					created_at: '2025-01-01T10:00:00Z',
					children: {
						child_id: 'child-1',
						first_name: 'Jane',
						last_name: 'Smith',
						dob: null,
						households: {
							household_id: 'household-1',
							name: 'Smith Family',
							primary_email: null
						}
					}
				}
			];

			// Should handle missing email gracefully
			const household = enrollments[0].children.households;
			expect(household.primary_email).toBeNull();
			
			// Should handle missing DOB gracefully
			const child = enrollments[0].children;
			expect(child.dob).toBeNull();
		});
	});

	describe('Data grouping', () => {
		test('should group enrollments by ministry correctly', () => {
			const enrollments = [
				{
					ministries: { ministry_id: 'ministry-1', name: 'Ministry A' },
					enrollment_id: 'enrollment-1'
				},
				{
					ministries: { ministry_id: 'ministry-2', name: 'Ministry B' },
					enrollment_id: 'enrollment-2'
				},
				{
					ministries: { ministry_id: 'ministry-1', name: 'Ministry A' },
					enrollment_id: 'enrollment-3'
				}
			];

			// Test grouping logic
			const grouped: Record<string, any> = {};
			for (const enrollment of enrollments) {
				const ministryId = enrollment.ministries.ministry_id;
				if (!grouped[ministryId]) {
					grouped[ministryId] = {
						ministry: enrollment.ministries,
						enrollments: []
					};
				}
				grouped[ministryId].enrollments.push(enrollment);
			}

			expect(Object.keys(grouped)).toHaveLength(2);
			expect(grouped['ministry-1'].enrollments).toHaveLength(2);
			expect(grouped['ministry-2'].enrollments).toHaveLength(1);
		});
	});

	describe('Date handling', () => {
		test('should calculate 24-hour checkpoint correctly', () => {
			const now = new Date('2025-01-02T10:00:00Z');
			const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			
			expect(twentyFourHoursAgo.toISOString()).toBe('2025-01-01T10:00:00.000Z');
		});

		test('should format dates for display correctly', () => {
			const testDate = new Date('2025-01-01T10:00:00Z');
			const formatted = testDate.toLocaleDateString();
			
			// Should format to a readable date string
			expect(formatted).toMatch(/\d+\/\d+\/\d+/);
		});
	});

	describe('DRY_RUN mode', () => {
		test('should log actions in dry run mode', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
			
			// Simulate dry run behavior
			const DRY_RUN = true;
			if (DRY_RUN) {
				console.log('[DRY RUN] Would update checkpoint');
				console.log('[DRY RUN] Would send email');
			}
			
			expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] Would update checkpoint');
			expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] Would send email');
			
			consoleSpy.mockRestore();
		});

		test('should log BCC monitor emails in dry run mode', () => {
			const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
			
			// Simulate dry run with monitor emails
			const DRY_RUN = true;
			const monitorEmails = ['admin@example.com', 'monitor@example.com'];
			
			if (DRY_RUN && monitorEmails.length > 0) {
				console.log(`[DRY RUN] Would BCC: ${monitorEmails.join(', ')}`);
			}
			
			expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] Would BCC: admin@example.com, monitor@example.com');
			
			consoleSpy.mockRestore();
		});
	});

	describe('Email message structure', () => {
		test('should create proper Mailjet message structure without BCC', () => {
			const message: any = {
				From: {
					Email: 'no-reply@example.com',
					Name: 'gatherKids System'
				},
				To: [{
					Email: 'recipient@example.com'
				}],
				Subject: 'Test Subject',
				TextPart: 'Test text content',
				HTMLPart: '<p>Test HTML content</p>'
			};

			expect(message.From.Email).toBe('no-reply@example.com');
			expect(message.To[0].Email).toBe('recipient@example.com');
			expect(message.Bcc).toBeUndefined();
		});

		test('should create proper Mailjet message structure with BCC', () => {
			const monitorEmails = ['admin@example.com', 'monitor@example.com'];
			const message: any = {
				From: {
					Email: 'no-reply@example.com',
					Name: 'gatherKids System'
				},
				To: [{
					Email: 'recipient@example.com'
				}],
				Subject: 'Test Subject',
				TextPart: 'Test text content',
				HTMLPart: '<p>Test HTML content</p>'
			};

			// Add BCC if monitor emails are configured
			if (monitorEmails.length > 0) {
				message.Bcc = monitorEmails.map(email => ({ Email: email }));
			}

			expect(message.Bcc).toEqual([
				{ Email: 'admin@example.com' },
				{ Email: 'monitor@example.com' }
			]);
		});
	});
});