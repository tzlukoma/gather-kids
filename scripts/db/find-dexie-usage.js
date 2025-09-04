#!/usr/bin/env node

/**
 * This script scans the source code for components that might be using
 * direct Dexie database queries instead of the database adapter methods.
 *
 * Usage:
 *   node scripts/db/find-dexie-usage.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// List of patterns that indicate direct Dexie usage
const DEXIE_PATTERNS = [
	'useLiveQuery',
	'db\\.\\w+\\.toArray\\(',
	'db\\.\\w+\\.where\\(',
	'db\\.\\w+\\.orderBy\\(',
	'db\\.\\w+\\.filter\\(',
	'db\\.\\w+\\.get\\(',
	'db\\.\\w+\\.count\\(',
	'db\\.\\w+\\.add\\(',
	'db\\.\\w+\\.put\\(',
	'db\\.\\w+\\.delete\\(',
	'db\\.\\w+\\.update\\(',
	'db\\.\\w+\\.bulkAdd\\(',
	'db\\.\\w+\\.bulkPut\\(',
	'db\\.\\w+\\.bulkDelete\\(',
];

// Directories to scan (relative to project root)
const SCAN_DIRS = ['src/app', 'src/components', 'src/contexts', 'src/hooks'];

// File extensions to check
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Get project root directory using ESM compatible approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

// Colors for terminal output
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
};

console.log(
	`${colors.cyan}🔍 Scanning for direct Dexie database usage...${colors.reset}\n`
);

// Count of files with Dexie usage
let totalFilesWithDexie = 0;
let totalFilesScanned = 0;

// Function to check if a file might be using Dexie directly
function checkFileForDexieUsage(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		totalFilesScanned++;

		// Check for patterns indicating direct Dexie usage
		const matches = DEXIE_PATTERNS.map((pattern) => {
			const regex = new RegExp(pattern, 'g');
			const found = content.match(regex);
			return found ? found.length : 0;
		}).reduce((a, b) => a + b, 0);

		if (matches > 0) {
			totalFilesWithDexie++;

			// Find some specific examples to show
			const lines = content.split('\n');
			const examples = [];

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];

				for (const pattern of DEXIE_PATTERNS) {
					const regex = new RegExp(pattern);
					if (regex.test(line)) {
						examples.push({
							line: i + 1,
							content: line.trim(),
						});
						break;
					}
				}

				// Limit to 3 examples per file
				if (examples.length >= 3) break;
			}

			// Output information about the file
			const relPath = path.relative(projectRoot, filePath);
			console.log(
				`${colors.red}⚠️  ${relPath}${colors.reset} (${matches} matches)`
			);

			examples.forEach((ex) => {
				console.log(
					`   ${colors.yellow}Line ${ex.line}:${colors.reset} ${ex.content}`
				);
			});

			console.log('');
		}

		return matches > 0;
	} catch (error) {
		console.error(`Error reading file ${filePath}: ${error.message}`);
		return false;
	}
}

// Recursively scan directories
function scanDirectory(dir) {
	try {
		const entries = fs.readdirSync(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and .git
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				scanDirectory(fullPath);
			} else if (entry.isFile()) {
				// Check if file has one of the extensions we're looking for
				const ext = path.extname(entry.name);
				if (FILE_EXTENSIONS.includes(ext)) {
					checkFileForDexieUsage(fullPath);
				}
			}
		}
	} catch (error) {
		console.error(`Error scanning directory ${dir}: ${error.message}`);
	}
}

// Run the scan
for (const dir of SCAN_DIRS) {
	scanDirectory(path.join(projectRoot, dir));
}

// Print summary
console.log(`${colors.cyan}📊 Scan complete!${colors.reset}`);
console.log(
	`${colors.white}Total files scanned:${colors.reset} ${totalFilesScanned}`
);
console.log(
	`${colors.white}Files with direct Dexie usage:${colors.reset} ${totalFilesWithDexie}`
);

if (totalFilesWithDexie > 0) {
	console.log(
		`\n${colors.yellow}⚠️  These files should be updated to use database adapter methods instead of direct Dexie queries.${colors.reset}`
	);
	console.log(
		`${colors.yellow}   See docs/DATABASE_ADAPTERS.md for guidance on proper database access patterns.${colors.reset}`
	);
} else {
	console.log(
		`\n${colors.green}✅ No files found using direct Dexie queries. Great job!${colors.reset}`
	);
}
