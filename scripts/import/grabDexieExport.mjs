#!/usr/bin/env node

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';

const argv = process.argv.slice(2);
const dryRun =
	argv.includes('--dry-run') || argv.includes('-n') || argv.includes('--noop');

const homedir = os.homedir();
const cwd = process.cwd();
const destDir = path.join(cwd, 'scripts', 'seed');
const destPath = path.join(destDir, 'gather-kids-export.json');

const downloadCandidates = [path.join(homedir, 'Downloads')];

const prefsFiles = [
	path.join(
		homedir,
		'Library',
		'Application Support',
		'Google',
		'Chrome',
		'Default',
		'Preferences'
	),
	path.join(
		homedir,
		'Library',
		'Application Support',
		'BraveSoftware',
		'Brave-Browser',
		'Default',
		'Preferences'
	),
	path.join(
		homedir,
		'Library',
		'Application Support',
		'Microsoft Edge',
		'Default',
		'Preferences'
	),
];

async function findDownloadDirs() {
	for (const p of prefsFiles) {
		try {
			if (!fsSync.existsSync(p)) continue;
			const raw = await fs.readFile(p, 'utf8');
			// Preferences is JSON but sometimes has trailing data; try JSON.parse safely
			let prefs;
			try {
				prefs = JSON.parse(raw);
			} catch {
				continue;
			}
			const dir =
				prefs?.download?.default_directory ||
				prefs?.download?.directory_upgrade ||
				prefs?.download?.default_download_directory;
			if (dir) {
				// Normalize and push
				const resolved = dir.startsWith('~')
					? path.join(homedir, dir.slice(1))
					: dir;
				downloadCandidates.push(resolved);
			}
		} catch (err) {
			// ignore
		}
	}
}

async function findLatestExport() {
	await findDownloadDirs();
	const matches = [];

	for (const d of Array.from(new Set(downloadCandidates))) {
		try {
			if (!fsSync.existsSync(d)) continue;
			const files = await fs.readdir(d);
			for (const f of files) {
				const lower = f.toLowerCase();
				if (lower.includes('gather-kids-export') && lower.endsWith('.json')) {
					const full = path.join(d, f);
					try {
						const st = await fs.stat(full);
						matches.push({ path: full, mtime: st.mtimeMs });
					} catch (e) {
						// ignore
					}
				}
			}
		} catch (err) {
			// ignore
		}
	}

	if (matches.length === 0) return null;
	matches.sort((a, b) => b.mtime - a.mtime);
	return matches[0].path;
}

async function ensureDir(p) {
	try {
		await fs.mkdir(p, { recursive: true });
	} catch (e) {
		/* ignore */
	}
}

async function backupIfExists(target) {
	try {
		if (fsSync.existsSync(target)) {
			const now = new Date().toISOString().replace(/[:.]/g, '-');
			const bak = `${target}.bak.${now}`;
			await fs.copyFile(target, bak);
			console.log(
				`Backed up existing ${path.basename(target)} -> ${path.basename(bak)}`
			);
		}
	} catch (e) {
		// ignore
	}
}

async function moveFile(src, dest) {
	try {
		// Try rename first
		await fs.rename(src, dest);
	} catch (err) {
		// Fallback to copy + unlink (works across filesystems)
		await fs.copyFile(src, dest);
		await fs.unlink(src);
	}
}

async function main() {
	const found = await findLatestExport();
	if (!found) {
		console.error(
			'No gather-kids-export JSON file found in known download locations.'
		);
		console.error(
			'Searched locations:',
			Array.from(new Set(downloadCandidates)).join(', ')
		);
		process.exitCode = 1;
		return;
	}

	console.log('Found export file:', found);
	console.log('Destination:', destPath);

	if (dryRun) {
		console.log('[dry-run] Not moving file.');
		return;
	}

	await ensureDir(destDir);
	await backupIfExists(destPath);

	try {
		await moveFile(found, destPath);
		console.log(`Moved ${found} -> ${destPath}`);
	} catch (err) {
		console.error('Failed to move file:', err.message || err);
		process.exitCode = 2;
	}
}

main();
