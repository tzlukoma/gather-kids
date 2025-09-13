#!/usr/bin/env node
/**
 * Daily Digest Script for gatherKids
 *
 * Sends digest emails of new ministry enrollments:
 * - Per-Ministry Digest → sent to each ministry's configured contact email
 * - Admin Digest → consolidated across all ministries, sent to all admins
 *
 * Uses Mailjet as the mail transport, with credentials stored in environment variables.
 * Supports switching providers via EMAIL_MODE environment variable.
 *
 * Usage:
 *   node scripts/dailyDigest.js
 *   EMAIL_MODE=smtp node scripts/dailyDigest.js
 *   DRY_RUN=true node scripts/dailyDigest.js
 */

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import nodemailer from 'nodemailer';

const require = createRequire(import.meta.url);
const Mailjet = require('node-mailjet');

// Environment setup
const ENVIRONMENT = process.env.ENVIRONMENT || ''; // 'UAT', 'PROD', or empty for default
const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_MODE = process.env.TEST_MODE === 'true';
const EMAIL_MODE = process.env.EMAIL_MODE || 'mailjet'; // 'mailjet' or 'smtp'

/**
 * Get environment variable with optional environment prefix support
 * @param {string} varName - Base variable name
 * @param {string[]} fallbacks - Additional fallback variable names
 * @returns {string|undefined} - Environment variable value
 */
function getEnvVar(varName, fallbacks = []) {
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

// Supabase client setup - use standard environment variables with fallbacks
const supabaseUrl =
	process.env.SUPABASE_URL ||
	(ENVIRONMENT === 'PROD'
		? process.env.PROD_SUPABASE_URL
		: process.env.UAT_SUPABASE_URL);
const serviceRoleKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	(ENVIRONMENT === 'PROD'
		? process.env.PROD_SUPABASE_SERVICE_ROLE_KEY
		: process.env.UAT_SUPABASE_SERVICE_ROLE_KEY);
const fromEmail =
	process.env.FROM_EMAIL ||
	(ENVIRONMENT === 'PROD'
		? process.env.PROD_FROM_EMAIL
		: process.env.UAT_FROM_EMAIL);

// Monitor emails for BCC (optional)
const monitorEmails = process.env.MONITOR_EMAILS
	? process.env.MONITOR_EMAILS.split(',')
			.map((email) => email.trim())
			.filter((email) => email)
	: (
			ENVIRONMENT === 'PROD'
				? process.env.PROD_MONITOR_EMAILS
				: process.env.UAT_MONITOR_EMAILS
	  )
	? (ENVIRONMENT === 'PROD'
			? process.env.PROD_MONITOR_EMAILS
			: process.env.UAT_MONITOR_EMAILS
	  )
			.split(',')
			.map((email) => email.trim())
			.filter((email) => email)
	: [];

// Debug logging for environment variables
console.log('Environment variables debug:');
console.log(`- ENVIRONMENT: ${ENVIRONMENT}`);
console.log(`- DRY_RUN: ${DRY_RUN}`);
console.log(`- TEST_MODE: ${TEST_MODE}`);
console.log(`- EMAIL_MODE: ${EMAIL_MODE}`);
console.log(`- FROM_EMAIL: ${fromEmail || 'NOT SET'}`);
console.log(
	`- MONITOR_EMAILS: ${
		monitorEmails.length > 0 ? monitorEmails.join(', ') : 'NOT SET'
	}`
);

// Debug: Show all environment variables that start with UAT_
console.log('\nAll UAT_ environment variables:');
Object.keys(process.env)
	.filter((key) => key.startsWith('UAT_'))
	.forEach((key) =>
		console.log(`- ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`)
	);

// Debug: Show all environment variables that start with FROM or MONITOR
console.log('\nAll FROM/MONITOR environment variables:');
Object.keys(process.env)
	.filter((key) => key.includes('FROM') || key.includes('MONITOR'))
	.forEach((key) =>
		console.log(`- ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`)
	);

if (!supabaseUrl || !serviceRoleKey) {
	console.error('Missing required environment variables:');
	console.error('- SUPABASE_URL');
	console.error('- SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

if (!fromEmail && !DRY_RUN) {
	console.error('Missing FROM_EMAIL environment variable');
	process.exit(1);
}

if (!fromEmail && DRY_RUN) {
	console.log('[DRY RUN] FROM_EMAIL not set - using placeholder for dry run');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey, {
	auth: { persistSession: false },
});

// Email configuration
let emailTransport;
if (EMAIL_MODE === 'mailjet') {
	const mjApiKey = process.env.MJ_API_KEY;
	const mjApiSecret = process.env.MJ_API_SECRET;

	if (!mjApiKey || !mjApiSecret) {
		console.error('Missing Mailjet credentials:');
		console.error('- MJ_API_KEY');
		console.error('- MJ_API_SECRET');
		process.exit(1);
	}

	emailTransport = {
		type: 'mailjet',
		client: new Mailjet({
			apiKey: mjApiKey,
			apiSecret: mjApiSecret,
		}),
	};
} else if (EMAIL_MODE === 'smtp') {
	// SMTP configuration can be extended later
	console.log('SMTP mode not yet implemented');
	process.exit(1);
} else {
	console.error(`Unknown EMAIL_MODE: ${EMAIL_MODE}. Use 'mailjet' or 'smtp'.`);
	process.exit(1);
}

const CHECKPOINT_TABLE = 'daily_digest_checkpoints';

// Check checkpoint table exists
async function verifyCheckpointTable() {
	console.log('Verifying checkpoint table exists...');

	// Simple check - try to query the table
	const { error } = await supabase
		.from(CHECKPOINT_TABLE)
		.select('checkpoint_name')
		.limit(1);

	if (error) {
		console.error(
			'Checkpoint table not found. Please run database migrations first.'
		);
		console.error('Error:', error.message);
		throw new Error('Missing checkpoint table - run migrations');
	}
}

// Get last checkpoint timestamp
async function getLastCheckpoint() {
	console.log('Getting last checkpoint...');

	const { data, error } = await supabase
		.from(CHECKPOINT_TABLE)
		.select('last_run_at')
		.eq('checkpoint_name', 'daily_digest')
		.single();

	if (error && error.code !== 'PGRST116') {
		console.error('Error getting checkpoint:', error);
		return null;
	}

	if (data) {
		console.log(`Last checkpoint: ${data.last_run_at}`);
		return new Date(data.last_run_at);
	}

	// No checkpoint found, use 24 hours ago as default
	const defaultCheckpoint = new Date(Date.now() - 24 * 60 * 60 * 1000);
	console.log(
		`No checkpoint found, using 24h ago: ${defaultCheckpoint.toISOString()}`
	);
	return defaultCheckpoint;
}

// Update checkpoint timestamp
async function updateCheckpoint(timestamp) {
	console.log(`Updating checkpoint to: ${timestamp.toISOString()}`);

	if (DRY_RUN) {
		console.log('[DRY RUN] Would update checkpoint');
		return;
	}

	const { error } = await supabase.from(CHECKPOINT_TABLE).upsert(
		{
			checkpoint_name: 'daily_digest',
			last_run_at: timestamp.toISOString(),
			updated_at: new Date().toISOString(),
		},
		{
			onConflict: 'checkpoint_name',
		}
	);

	if (error) {
		console.error('Error updating checkpoint:', error);
		throw error;
	}
}

// Query new ministry enrollments since last checkpoint
async function getNewEnrollments(since) {
	console.log(`Querying enrollments since: ${since.toISOString()}`);

	const { data, error } = await supabase
		.from('ministry_enrollments')
		.select(
			`
			created_at,
			enrollment_id,
			status,
			ministries!inner (
				ministry_id,
				name,
				email
			),
			children!inner (
				child_id,
				first_name,
				last_name,
				dob,
				households!inner (
					household_id,
					primary_email,
					name
				)
			)
		`
		)
		.gte('created_at', since.toISOString())
		.lte('created_at', new Date().toISOString())
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Error querying enrollments:', error);
		throw error;
	}

	console.log(`Found ${data?.length || 0} new enrollments`);
	return data || [];
}

// Get admin users
async function getAdminUsers() {
	console.log('Getting admin users...');

	const { data, error } = await supabase
		.from('users')
		.select('user_id, name, email')
		.eq('role', 'ADMIN')
		.eq('is_active', true);

	if (error) {
		console.error('Error querying admin users:', error);
		throw error;
	}

	console.log(`Found ${data?.length || 0} admin users`);
	return data || [];
}

// Group enrollments by ministry
function groupEnrollmentsByMinistry(enrollments) {
	const grouped = {};

	for (const enrollment of enrollments) {
		const ministryId = enrollment.ministries.ministry_id;
		if (!grouped[ministryId]) {
			grouped[ministryId] = {
				ministry: enrollment.ministries,
				enrollments: [],
			};
		}
		grouped[ministryId].enrollments.push(enrollment);
	}

	return grouped;
}

// Generate email content for ministry digest
function generateMinistryEmailContent(ministry, enrollments) {
	const subject = `New Enrollments for ${ministry.name} - Daily Digest`;

	let html = `
		<h2>Daily Enrollment Digest - ${ministry.name}</h2>
		<p>You have received ${enrollments.length} new enrollment${
		enrollments.length !== 1 ? 's' : ''
	} since yesterday:</p>
		<ul>
	`;

	let text = `Daily Enrollment Digest - ${ministry.name}\n\n`;
	text += `You have received ${enrollments.length} new enrollment${
		enrollments.length !== 1 ? 's' : ''
	} since yesterday:\n\n`;

	for (const enrollment of enrollments) {
		const child = enrollment.children;
		const household = child.households;
		const enrolledAt = new Date(enrollment.created_at).toLocaleDateString();

		html += `
			<li>
				<strong>${child.first_name} ${child.last_name}</strong>
				${child.dob ? ` (DOB: ${child.dob})` : ''}
				<br>
				Household: ${household.name || 'N/A'}
				${household.primary_email ? ` (${household.primary_email})` : ''}
				<br>
				Enrolled: ${enrolledAt}
			</li>
		`;

		text += `• ${child.first_name} ${child.last_name}`;
		if (child.dob) text += ` (DOB: ${child.dob})`;
		text += `\n  Household: ${household.name || 'N/A'}`;
		if (household.primary_email) text += ` (${household.primary_email})`;
		text += `\n  Enrolled: ${enrolledAt}\n\n`;
	}

	html += `
		</ul>
		<p>Please review these enrollments in your ministry dashboard.</p>
		<hr>
		<p><small>This is an automated daily digest from gatherKids. If you no longer wish to receive these emails, please contact your system administrator.</small></p>
	`;

	text += '\nPlease review these enrollments in your ministry dashboard.\n\n';
	text +=
		'This is an automated daily digest from gatherKids. If you no longer wish to receive these emails, please contact your system administrator.';

	return { subject, html, text };
}

// Generate email content for admin digest
function generateAdminEmailContent(enrollmentsByMinistry, totalCount) {
	const subject = `New Ministry Enrollments - Admin Daily Digest (${totalCount} total)`;

	let html = `
		<h2>Admin Daily Enrollment Digest</h2>
		<p>Total new enrollments across all ministries: <strong>${totalCount}</strong></p>
	`;

	let text = `Admin Daily Enrollment Digest\n\n`;
	text += `Total new enrollments across all ministries: ${totalCount}\n\n`;

	for (const [ministryId, group] of Object.entries(enrollmentsByMinistry)) {
		const { ministry, enrollments } = group;

		html += `
			<h3>${ministry.name} (${enrollments.length} enrollment${
			enrollments.length !== 1 ? 's' : ''
		})</h3>
			<ul>
		`;

		text += `${ministry.name} (${enrollments.length} enrollment${
			enrollments.length !== 1 ? 's' : ''
		}):\n`;

		for (const enrollment of enrollments) {
			const child = enrollment.children;
			const household = child.households;
			const enrolledAt = new Date(enrollment.created_at).toLocaleDateString();

			html += `
				<li>
					${child.first_name} ${child.last_name}
					${child.dob ? ` (DOB: ${child.dob})` : ''}
					- ${household.name || 'N/A'}
					${household.primary_email ? ` (${household.primary_email})` : ''}
					- ${enrolledAt}
				</li>
			`;

			text += `  • ${child.first_name} ${child.last_name}`;
			if (child.dob) text += ` (DOB: ${child.dob})`;
			text += ` - ${household.name || 'N/A'}`;
			if (household.primary_email) text += ` (${household.primary_email})`;
			text += ` - ${enrolledAt}\n`;
		}

		html += '</ul>';
		text += '\n';
	}

	html += `
		<hr>
		<p><small>This is an automated daily digest from gatherKids.</small></p>
	`;

	text += '\nThis is an automated daily digest from gatherKids.';

	return { subject, html, text };
}

// Send email via Mailjet
async function sendEmailViaMailjet(to, subject, html, text) {
	console.log(`Sending email to: ${to}`);
	console.log(`Subject: ${subject}`);

	if (monitorEmails.length > 0) {
		console.log(`BCC monitor emails: ${monitorEmails.join(', ')}`);
	}

	if (DRY_RUN) {
		console.log('[DRY RUN] Would send email');
		console.log('Content preview:', text.substring(0, 200) + '...');
		if (monitorEmails.length > 0) {
			console.log(`[DRY RUN] Would BCC: ${monitorEmails.join(', ')}`);
		}
		return true;
	}

	if (TEST_MODE) {
		console.log('[TEST MODE] Redirecting email to monitor addresses only');
		if (monitorEmails.length === 0) {
			console.log('[TEST MODE] No monitor emails configured - skipping');
			return true;
		}
		// Override the 'to' address with monitor emails
		to = monitorEmails.join(', ');
		console.log(`[TEST MODE] Sending to monitor emails: ${to}`);
	}

	try {
		const message = {
			From: {
				Email: fromEmail || 'dry-run@example.com',
				Name: 'gatherKids System',
			},
			To: [
				{
					Email: to,
				},
			],
			Subject: subject,
			TextPart: text,
			HTMLPart: html,
		};

		// Add BCC recipients if monitor emails are configured (but not in test mode)
		if (monitorEmails.length > 0 && !TEST_MODE) {
			message.Bcc = monitorEmails.map((email) => ({ Email: email }));
		}

		const result = await emailTransport.client
			.post('send', { version: 'v3.1' })
			.request({
				Messages: [message],
			});

		console.log(`Email sent successfully to ${to}`);
		if (monitorEmails.length > 0 && !TEST_MODE) {
			console.log(`BCC sent to monitor emails: ${monitorEmails.join(', ')}`);
		}
		return true;
	} catch (error) {
		console.error(`Error sending email to ${to}:`, error);
		return false;
	}
}

// Send digest emails
async function sendDigestEmails(enrollmentsByMinistry, adminUsers) {
	const results = {
		ministry: { sent: 0, failed: 0 },
		admin: { sent: 0, failed: 0 },
	};

	// Send ministry-specific digests
	for (const [ministryId, group] of Object.entries(enrollmentsByMinistry)) {
		const { ministry, enrollments } = group;

		if (!ministry.email) {
			console.log(
				`Skipping ministry ${ministry.name} - no contact email configured`
			);
			continue;
		}

		const emailContent = generateMinistryEmailContent(ministry, enrollments);
		const success = await sendEmailViaMailjet(
			ministry.email,
			emailContent.subject,
			emailContent.html,
			emailContent.text
		);

		if (success) {
			results.ministry.sent++;
		} else {
			results.ministry.failed++;
		}
	}

	// Send admin digest
	if (adminUsers.length > 0) {
		const totalEnrollments = Object.values(enrollmentsByMinistry).reduce(
			(sum, group) => sum + group.enrollments.length,
			0
		);

		const emailContent = generateAdminEmailContent(
			enrollmentsByMinistry,
			totalEnrollments
		);

		for (const admin of adminUsers) {
			if (!admin.email) {
				console.log(`Skipping admin ${admin.name} - no email configured`);
				continue;
			}

			const success = await sendEmailViaMailjet(
				admin.email,
				emailContent.subject,
				emailContent.html,
				emailContent.text
			);

			if (success) {
				results.admin.sent++;
			} else {
				results.admin.failed++;
			}
		}
	}

	return results;
}

// Main function
async function main() {
	console.log('Starting daily digest process...');
	console.log(
		`Mode: ${DRY_RUN ? 'DRY RUN' : TEST_MODE ? 'TEST MODE' : 'LIVE'}`
	);
	console.log(`Email mode: ${EMAIL_MODE}`);

	if (monitorEmails.length > 0) {
		console.log(`Monitor emails configured: ${monitorEmails.join(', ')}`);
	} else {
		console.log('No monitor emails configured');
	}

	try {
		// Verify checkpoint table exists
		await verifyCheckpointTable();

		// Get last checkpoint
		const lastCheckpoint = await getLastCheckpoint();
		if (!lastCheckpoint) {
			console.error('Could not determine last checkpoint');
			process.exit(1);
		}

		// Query new enrollments
		const enrollments = await getNewEnrollments(lastCheckpoint);

		if (enrollments.length === 0) {
			console.log('No new enrollments found. No emails to send.');

			// Update checkpoint even if no enrollments
			await updateCheckpoint(new Date());
			console.log('Daily digest completed - no new enrollments');
			return;
		}

		// Group enrollments by ministry
		const enrollmentsByMinistry = groupEnrollmentsByMinistry(enrollments);
		console.log(
			`Enrollments grouped into ${
				Object.keys(enrollmentsByMinistry).length
			} ministries`
		);

		// Get admin users
		const adminUsers = await getAdminUsers();

		// Send digest emails
		const results = await sendDigestEmails(enrollmentsByMinistry, adminUsers);

		console.log('Email sending results:');
		console.log(
			`- Ministry emails: ${results.ministry.sent} sent, ${results.ministry.failed} failed`
		);
		console.log(
			`- Admin emails: ${results.admin.sent} sent, ${results.admin.failed} failed`
		);

		// Update checkpoint only if all emails succeeded (and not in test mode)
		const totalFailed = results.ministry.failed + results.admin.failed;
		if (totalFailed === 0) {
			if (TEST_MODE) {
				console.log('Test mode: Checkpoint not updated - this was a test run');
			} else {
				await updateCheckpoint(new Date());
				console.log('Daily digest completed successfully');
			}
		} else {
			console.error(
				`${totalFailed} emails failed. Checkpoint not updated - will retry on next run.`
			);
			process.exit(1);
		}
	} catch (error) {
		console.error('Error in daily digest process:', error);
		process.exit(1);
	}
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
