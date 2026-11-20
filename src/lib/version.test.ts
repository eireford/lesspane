import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { appVersion } from './version';

it('shows the version from package.json', () => {
	const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
	expect(appVersion).toBe(version);
	expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);
});
