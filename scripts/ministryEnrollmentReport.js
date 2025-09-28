#!/usr/bin/env node
/**
 * Ministry Enrollment Report Script for gatherKids
 *
 * Generates and sends enrollment reports for specified ministries:
 * - Lists all children enrolled in the specified ministries
 * - Groups children by ministry
 * - Sends email report to specified recipients
 *
 * Uses Mailjet as the mail transport, with credentials stored in environment variables.
 * Supports switching providers via EMAIL_MODE environment variable.
 *
 * Usage:
 *   node scripts/ministryEnrollmentReport.js
 *   EMAIL_MODE=smtp node scripts/ministryEnrollmentReport.js
 *   DRY_RUN=true node scripts/ministryEnrollmentReport.js
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

	// Check fallback variables
	for (const fallback of fallbacks) {
		if (process.env[fallback]) {
			return process.env[fallback];
		}
	}

	return undefined;
}

// Get configuration from environment variables
const config = {
	supabaseUrl: getEnvVar('SUPABASE_URL', ['DATABASE_URL']),
	supabaseServiceKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
	mjApiKey: getEnvVar('MJ_API_KEY'),
	mjApiSecret: getEnvVar('MJ_API_SECRET'),
	fromEmail: getEnvVar('FROM_EMAIL'),
	monitorEmails: getEnvVar('MONITOR_EMAILS'),
	recipientEmails: process.env.RECIPIENT_EMAILS,
	ministryIds: process.env.MINISTRY_IDS,
};

// Validate required configuration
const requiredVars = [
	'supabaseUrl',
	'supabaseServiceKey',
	'fromEmail',
	'recipientEmails',
];
const missingVars = requiredVars.filter((varName) => !config[varName]);

if (missingVars.length > 0) {
	console.error(
		'❌ Missing required environment variables:',
		missingVars.join(', ')
	);
	console.error('Required variables:', requiredVars);
	process.exit(1);
}

if (EMAIL_MODE === 'mailjet' && (!config.mjApiKey || !config.mjApiSecret)) {
	console.error('❌ Missing Mailjet credentials (MJ_API_KEY, MJ_API_SECRET)');
	process.exit(1);
}

// Parse recipient emails and ministry IDs
const recipientEmails = config.recipientEmails
	.split(',')
	.map((email) => email.trim())
	.filter((email) => email.length > 0);

const ministryIds = config.ministryIds
	? config.ministryIds
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id.length > 0)
	: []; // Empty array means all ministries

console.log('📧 Ministry Enrollment Report Configuration:');
console.log(`Environment: ${ENVIRONMENT || 'DEFAULT'}`);
console.log(`Dry run: ${DRY_RUN}`);
console.log(`Test mode: ${TEST_MODE}`);
console.log(`Email mode: ${EMAIL_MODE}`);
console.log(`Recipients: ${recipientEmails.join(', ')}`);
console.log(
	`Ministry IDs: ${
		ministryIds.length > 0 ? ministryIds.join(', ') : 'ALL MINISTRIES'
	}`
);
console.log(`From email: ${config.fromEmail}`);
console.log(`Monitor emails: ${config.monitorEmails || 'None'}`);

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Get all ministries
 * @returns {Promise<Array>} Array of ministry objects
 */
async function getAllMinistries() {
	console.log('📋 Fetching all ministries...');

	const { data: ministries, error } = await supabase
		.from('ministries')
		.select('ministry_id, name, code, is_active')
		.eq('is_active', true)
		.order('name');

	if (error) {
		console.error('❌ Error fetching ministries:', error);
		throw error;
	}

	console.log(`✅ Found ${ministries.length} active ministries`);
	return ministries;
}

/**
 * Get children enrolled in specified ministries
 * @param {Array} targetMinistries - Array of ministry objects to include
 * @returns {Promise<Array>} Array of enrollment data with child and ministry info
 */
async function getEnrollmentsForMinistries(targetMinistries) {
	if (targetMinistries.length === 0) {
		console.log('⚠️ No ministries specified, returning empty results');
		return [];
	}

	const ministryIds = targetMinistries.map((m) => m.ministry_id);
	console.log(
		`📋 Fetching enrollments for ${ministryIds.length} ministries...`
	);

	// Get current active cycle
	const { data: cycles, error: cycleError } = await supabase
		.from('registration_cycles')
		.select('cycle_id')
		.eq('is_active', true)
		.limit(1);

	if (cycleError) {
		console.error('❌ Error fetching active cycle:', cycleError);
		throw cycleError;
	}

	if (!cycles || cycles.length === 0) {
		console.error('❌ No active registration cycle found');
		throw new Error('No active registration cycle found');
	}

	const activeCycleId = cycles[0].cycle_id;
	console.log(`📅 Using active cycle: ${activeCycleId}`);

	// Get enrollments with child and household data
	const { data: enrollments, error } = await supabase
		.from('ministry_enrollments')
		.select(
			`
			enrollment_id,
			child_id,
			ministry_id,
			status,
			enrolled_at,
			children!inner (
				child_id,
				first_name,
				last_name,
				dob,
				household_id,
				households!children_household_id_fkey (
					household_id,
					name,
					guardians!guardians_household_id_fkey (
						email,
						is_primary
					)
				)
			)
		`
		)
		.eq('cycle_id', activeCycleId)
		.in('ministry_id', ministryIds)
		.eq('status', 'enrolled');

	if (error) {
		console.error('❌ Error fetching enrollments:', error);
		throw error;
	}

	console.log(`✅ Found ${enrollments.length} enrollments`);

	// Sort enrollments by child name (last name, then first name)
	enrollments.sort((a, b) => {
		const aLastName = a.children.last_name || '';
		const bLastName = b.children.last_name || '';
		const aFirstName = a.children.first_name || '';
		const bFirstName = b.children.first_name || '';

		// First sort by last name
		const lastNameComparison = aLastName.localeCompare(bLastName);
		if (lastNameComparison !== 0) {
			return lastNameComparison;
		}

		// Then by first name
		return aFirstName.localeCompare(bFirstName);
	});

	return enrollments;
}

/**
 * Group enrollments by ministry
 * @param {Array} enrollments - Array of enrollment data
 * @param {Array} ministries - Array of ministry objects
 * @returns {Object} Object with ministry_id as keys and enrollment arrays as values
 */
function groupEnrollmentsByMinistry(enrollments, ministries) {
	const grouped = {};

	// Initialize groups for all target ministries
	ministries.forEach((ministry) => {
		grouped[ministry.ministry_id] = {
			ministry: ministry,
			enrollments: [],
		};
	});

	// Group enrollments
	enrollments.forEach((enrollment) => {
		if (grouped[enrollment.ministry_id]) {
			grouped[enrollment.ministry_id].enrollments.push(enrollment);
		}
	});

	return grouped;
}

/**
 * Generate HTML email content
 * @param {Object} groupedEnrollments - Enrollments grouped by ministry
 * @param {string} reportDate - Date of the report
 * @returns {string} HTML email content
 */
function generateEmailContent(groupedEnrollments, reportDate) {
	const ministryEntries = Object.values(groupedEnrollments);
	const totalChildren = ministryEntries.reduce(
		(sum, group) => sum + group.enrollments.length,
		0
	);
	const totalMinistries = ministryEntries.filter(
		(group) => group.enrollments.length > 0
	).length;

	let html = `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8">
			<title>Ministry Enrollment Report</title>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
				.ministry-section { margin-bottom: 30px; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden; }
				.ministry-header { background-color: #e9ecef; padding: 15px; font-weight: bold; font-size: 18px; }
				.ministry-content { padding: 15px; }
				.child-row { padding: 8px 0; border-bottom: 1px solid #f1f3f4; }
				.child-row:last-child { border-bottom: none; }
				.child-name { font-weight: bold; }
				.child-details { color: #666; font-size: 14px; margin-top: 4px; }
				.summary { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
				.no-enrollments { color: #666; font-style: italic; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>Ministry Enrollment Report</h1>
				<p><strong>Report Date:</strong> ${reportDate}</p>
				<p><strong>Total Children:</strong> ${totalChildren}</p>
				<p><strong>Ministries with Enrollments:</strong> ${totalMinistries}</p>
			</div>
	`;

	// Add ministry sections
	ministryEntries
		.sort((a, b) => a.ministry.name.localeCompare(b.ministry.name))
		.forEach((group) => {
			const { ministry, enrollments } = group;

			html += `
				<div class="ministry-section">
					<div class="ministry-header">
						${ministry.name} (${enrollments.length} children)
					</div>
					<div class="ministry-content">
			`;

			if (enrollments.length === 0) {
				html +=
					'<p class="no-enrollments">No children currently enrolled in this ministry.</p>';
			} else {
				enrollments.forEach((enrollment) => {
					const child = enrollment.children;
					const household = child.households;
					const age = child.dob
						? Math.floor(
								(new Date() - new Date(child.dob)) /
									(365.25 * 24 * 60 * 60 * 1000)
						  )
						: 'Unknown';

					// Find primary guardian email
					const primaryGuardian = household?.guardians?.find(
						(g) => g.is_primary
					);
					const householdEmail = primaryGuardian?.email || 'Not provided';

					html += `
						<div class="child-row">
							<div class="child-name">${child.first_name} ${child.last_name}</div>
							<div class="child-details">
								Age: ${age} | Household: ${household.name || 'Unknown'} | 
								Email: ${householdEmail}
							</div>
						</div>
					`;
				});
			}

			html += `
					</div>
				</div>
			`;
		});

	html += `
			<div class="summary">
				<p><strong>Report Summary:</strong></p>
				<ul>
					<li>Total children enrolled: ${totalChildren}</li>
					<li>Ministries with enrollments: ${totalMinistries}</li>
					<li>Total ministries included: ${ministryEntries.length}</li>
				</ul>
			</div>
		</body>
		</html>
	`;

	return html;
}

/**
 * Send email using Mailjet
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @param {Array} toEmails - Array of recipient email addresses
 * @param {Array} bccEmails - Array of BCC email addresses
 */
async function sendEmailWithMailjet(
	subject,
	htmlContent,
	toEmails,
	bccEmails = []
) {
	if (DRY_RUN) {
		console.log('🔍 DRY RUN: Would send email with Mailjet');
		console.log(`Subject: ${subject}`);
		console.log(`To: ${toEmails.join(', ')}`);
		console.log(`BCC: ${bccEmails.join(', ')}`);
		console.log(`Content length: ${htmlContent.length} characters`);
		return;
	}

	const mailjet = new Mailjet({
		apiKey: config.mjApiKey,
		apiSecret: config.mjApiSecret,
	});

	const request = mailjet.post('send', { version: 'v3.1' }).request({
		Messages: [
			{
				From: {
					Email: config.fromEmail,
					Name: 'GatherKids Ministry Report',
				},
				To: toEmails.map((email) => ({ Email: email })),
				Bcc: bccEmails.map((email) => ({ Email: email })),
				Subject: subject,
				HTMLPart: htmlContent,
			},
		],
	});

	try {
		const result = await request;
		console.log('✅ Email sent successfully via Mailjet');
		console.log(`Message ID: ${result.body.Messages[0].To[0].MessageID}`);
	} catch (error) {
		console.error('❌ Error sending email via Mailjet:', error);
		throw error;
	}
}

/**
 * Main function to generate and send ministry enrollment report
 */
async function generateMinistryEnrollmentReport() {
	try {
		console.log('🚀 Starting ministry enrollment report generation...');

		// Get all ministries
		const allMinistries = await getAllMinistries();

		// Filter to target ministries if specified
		const targetMinistries =
			ministryIds.length > 0
				? allMinistries.filter((ministry) =>
						ministryIds.includes(ministry.ministry_id)
				  )
				: allMinistries;

		if (targetMinistries.length === 0) {
			console.error('❌ No matching ministries found for the specified IDs');
			process.exit(1);
		}

		console.log(
			`📋 Target ministries: ${targetMinistries.map((m) => m.name).join(', ')}`
		);

		// Get enrollments for target ministries
		const enrollments = await getEnrollmentsForMinistries(targetMinistries);

		// Group enrollments by ministry
		const groupedEnrollments = groupEnrollmentsByMinistry(
			enrollments,
			targetMinistries
		);

		// Generate email content
		const reportDate = new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		const htmlContent = generateEmailContent(groupedEnrollments, reportDate);

		// Determine recipients
		let finalRecipients = recipientEmails;
		if (TEST_MODE && config.monitorEmails) {
			console.log('🧪 TEST MODE: Sending only to monitor emails');
			finalRecipients = config.monitorEmails
				.split(',')
				.map((email) => email.trim());
		}

		// Generate subject
		const totalChildren = Object.values(groupedEnrollments).reduce(
			(sum, group) => sum + group.enrollments.length,
			0
		);
		const subject = `Ministry Enrollment Report - ${totalChildren} Children Across ${targetMinistries.length} Ministries`;

		// Send email
		const bccEmails = config.monitorEmails
			? config.monitorEmails.split(',').map((email) => email.trim())
			: [];
		await sendEmailWithMailjet(
			subject,
			htmlContent,
			finalRecipients,
			bccEmails
		);

		console.log('✅ Ministry enrollment report completed successfully');
		console.log(`📧 Report sent to: ${finalRecipients.join(', ')}`);
		console.log(`📊 Total children: ${totalChildren}`);
		console.log(`🏢 Total ministries: ${targetMinistries.length}`);
	} catch (error) {
		console.error('❌ Error generating ministry enrollment report:', error);
		process.exit(1);
	}
}

// Run the report generation
generateMinistryEnrollmentReport();
