import { env } from '$env/dynamic/private';
import { redirect, type Handle } from '@sveltejs/kit';
import { createHash, timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE, isAllowedAdmin, readSession } from '$lib/server/session';

const digest = (s: string) => createHash('sha256').update(s).digest();
const sameSecret = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/**
 * The owner page has two ways in:
 *   GOOGLE_CLIENT_ID set → Google sign-in (/auth/login), only for ADMIN_EMAILS. Used on Cloud Run.
 *   otherwise            → HTTP Basic auth with ADMIN_PASSWORD (any username). Handy for local development.
 */
function adminAuthorized(header: string | null, password: string): boolean {
	if (!header?.startsWith('Basic ')) return false;
	const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
	const pass = decoded.slice(decoded.indexOf(':') + 1);
	return sameSecret(pass, password);
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/')) {
		if (env.GOOGLE_CLIENT_ID) {
			const email = readSession(event.cookies.get(SESSION_COOKIE), env.SESSION_SECRET ?? '');
			// Re-check the allow-list each time, so removing an address takes effect immediately.
			if (!email || !isAllowedAdmin(email, env.ADMIN_EMAILS)) {
				redirect(303, `/auth/login?next=${encodeURIComponent(event.url.pathname)}`);
			}
			event.locals.admin = email;
			return withHeaders(await resolve(event));
		}
		const password = env.ADMIN_PASSWORD;
		if (!password) return new Response('Not found', { status: 404 });
		if (!adminAuthorized(event.request.headers.get('authorization'), password)) {
			return new Response('Authentication required', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="LessPane admin", charset="UTF-8"' }
			});
		}
	}

	return withHeaders(await resolve(event));
};

function withHeaders(response: Response): Response {
	try {
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		response.headers.set('X-Frame-Options', 'DENY');
		// Keep the staging site (lesspane.net) out of search results.
		if (env.APP_ENV === 'staging') response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	} catch {
		// Some responses have immutable headers; skip them.
	}
	return response;
}
