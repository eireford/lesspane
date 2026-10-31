import { createHmac, timingSafeEqual } from 'node:crypto';

// The owner's signed-in session for /admin: "email.expiry.signature" in an HttpOnly cookie, signed with
// SESSION_SECRET. Stateless, so nothing to store, and it simply stops working at expiry or if the secret
// changes (which signs everyone out).

export const SESSION_COOKIE = 'lp_admin';
export const SESSION_HOURS = 12;

const sign = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest('base64url');

export function makeSession(email: string, secret: string, now = Date.now()): string {
	const data = `${Buffer.from(email).toString('base64url')}.${now + SESSION_HOURS * 3600_000}`;
	return `${data}.${sign(data, secret)}`;
}

/** The signed-in email, or null if the cookie is missing, tampered with or expired. */
export function readSession(cookie: string | undefined, secret: string, now = Date.now()): string | null {
	if (!cookie || !secret) return null;
	const [emailPart, expiry, sig] = cookie.split('.');
	if (!emailPart || !expiry || !sig) return null;
	const want = Buffer.from(sign(`${emailPart}.${expiry}`, secret));
	const got = Buffer.from(sig);
	if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
	if (Number(expiry) < now) return null;
	return Buffer.from(emailPart, 'base64url').toString();
}

/** Whether a verified Google account may use /admin: listed in ADMIN_EMAILS (comma-separated, case-insensitive). */
export function isAllowedAdmin(email: string, allowList: string | undefined): boolean {
	const allowed = (allowList ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(email.trim().toLowerCase());
}
