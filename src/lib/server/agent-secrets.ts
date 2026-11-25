import * as env from '$app/env/private';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Server-signed values for agent orders: quote ids (so an agent can't change what it was quoted) and the manage
// link of an agent's request (derived from the request id, so a retried request gets the same link back without
// the link ever being stored). Keyed with SESSION_SECRET, which every Cloud Run service has; locally, without one,
// a random key per process is used, so quote ids stop working when the dev server restarts.

let fallback: Buffer | null = null;
function key(): Buffer | string {
	if (env.SESSION_SECRET) return env.SESSION_SECRET;
	fallback ??= randomBytes(32);
	return fallback;
}

/** HMAC-SHA256 of `purpose:value`, so the same key never signs two kinds of thing alike. */
const mac = (purpose: string, value: string) => createHmac('sha256', key()).update(`${purpose}:${value}`).digest();

/** `<payload>.<signature>`, both base64url. */
export function sign(purpose: string, payload: object): string {
	const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
	return `${body}.${mac(purpose, body).toString('base64url')}`;
}

/** The payload, or null when the value is malformed or its signature is wrong. */
export function verify<T>(purpose: string, value: string): T | null {
	const [body, sig, extra] = value.split('.');
	if (!body || !sig || extra !== undefined || value.length > 2000) return null;
	const expected = mac(purpose, body);
	const given = Buffer.from(sig, 'base64url');
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
	try {
		return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
	} catch {
		return null;
	}
}

/** The manage-link secret of an agent's request: 24 bytes of HMAC, 32 URL-safe characters like a random one. */
export const derivedManageToken = (requestId: string) => mac('manage', requestId).subarray(0, 24).toString('base64url');
