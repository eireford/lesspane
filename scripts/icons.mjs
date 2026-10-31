#!/usr/bin/env node
// Renders static/icon.svg into the PNG icons the site and app manifest use, with headless Chromium.
//   node scripts/icons.mjs
// The maskable icon draws the window smaller so it survives a circular or squircle mask (80% safe zone).
// favicon.ico packs 16, 32 and 48 px PNGs: browsers and Windows request /favicon.ico on their own.

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
	['.ico-16.png', 16, svg],
	['.ico-32.png', 32, svg],
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
	writeFileSync(out.startsWith('.ico') ? path.join(work, out) : path.join(root, 'static', out), readFileSync(png));
	if (!out.startsWith('.ico')) console.log(`static/${out}  ${size}×${size}`);
}

// ICO = 6-byte header, a 16-byte directory entry per image, then the PNG files themselves.
const icoImages = [path.join(work, '.ico-16.png'), path.join(work, '.ico-32.png'), path.join(root, 'static/favicon.png')].map(
	(f, i) => ({ size: [16, 32, 48][i], data: readFileSync(f) })
);
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach(({ size, data }, i) => {
	const e = 6 + 16 * i;
	header.writeUInt8(size, e);
	header.writeUInt8(size, e + 1);
	header.writeUInt16LE(1, e + 4); // colour planes
	header.writeUInt16LE(32, e + 6); // bits per pixel
	header.writeUInt32LE(data.length, e + 8);
	header.writeUInt32LE(offset, e + 12);
	offset += data.length;
});
writeFileSync(path.join(root, 'static/favicon.ico'), Buffer.concat([header, ...icoImages.map((x) => x.data)]));
console.log('static/favicon.ico  16, 32, 48');
rmSync(work, { recursive: true, force: true });
