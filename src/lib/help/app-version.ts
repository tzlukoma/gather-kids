import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = { version?: string };

export function getAppVersion(cwd = process.cwd()): string {
	try {
		const pkg = JSON.parse(
			readFileSync(join(cwd, 'package.json'), 'utf8')
		) as PackageJson;
		if (pkg.version) return pkg.version;
	} catch {
		// Fall through to generated build info
	}

	try {
		const buildInfo = JSON.parse(
			readFileSync(join(cwd, 'src/generated/build-info.json'), 'utf8')
		) as { appVersion?: string };
		if (buildInfo.appVersion) return buildInfo.appVersion;
	} catch {
		// Ignore
	}

	return '0.0.0';
}
