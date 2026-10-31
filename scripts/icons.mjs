#!/usr/bin/env node
// Renders static/icon.svg into the PNG icons the site and app manifest use, with headless Chromium.
//   node scripts/icons.mjs
// The maskable icon draws the window smaller so it survives a circular or squircle mask (80% safe zone).

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const svg = readFileSync(path.join(root, 'static/icon.svg'), 'utf8');
// Same art, scaled into the middle 72% over a full-bleed background.
const maskable = svg
	.replace('<rect width="512" height="512" rx="112" fill="url(#bg)" />', '<rect width="512" height="512" fill="url(#bg)" /><g transform="translate(72 72) scale(0.72)">')
	.replace('</svg>', '</g></svg>');

const sizes = [
	['favicon.png', 48, svg],
	['icons/apple-touch-icon.png', 180, svg],
	['icons/icon-192.png', 192, svg],
	['icons/icon-512.png', 512, svg],
	['icons/icon-maskable-512.png', 512, maskable]
];

// Under the project, not /tmp: the snap-packaged Chromium can't read /tmp.
const work = path.join(root, '.shots/icons');
mkdirSync(work, { recursive: true });
const chrome = process.env.CHROME || 'chromium-browser';

for (const [out, size, art] of sizes) {
	const html = path.join(work, 'icon.html');
	writeFileSync(html, `<html><body style="margin:0;background:transparent">${art.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
	const png = path.join(work, 'icon.png');
	execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${size},${size}`, `--screenshot=${png}`, `file://${html}`], { stdio: 'ignore' });
	writeFileSync(path.join(root, 'static', out), readFileSync(png));
	console.log(`static/${out}  ${size}×${size}`);
}
rmSync(work, { recursive: true, force: true });
