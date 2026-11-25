import * as env from '$app/env/private';
import { googleFetch, SCOPES } from './google';
import { changeEmails, customerConfirmation, ownerAlert, type Email } from './messages';
import { rawEmail } from './mime';
import type { QuoteRequest } from './store';

const FROM = () => env.EMAIL_FROM || 'LessPane <hello@lesspane.com>';

/**
 * Sends one email, picking the first that's configured:
 *   GMAIL_USER     → Gmail API as that Google Workspace user (domain-wide delegation; see google.ts). The
 *                    From address (EMAIL_FROM) must be one of that user's send-as addresses.
 *   RESEND_API_KEY → Resend's HTTP API.
 *   neither        → logged, so local development works with no email account.
 * Never throws: a failed email must not lose a booking request. Failures log the email so it isn't lost.
 */
async function send(email: Email): Promise<void> {
	const log = (why: string) => console.info(`[email:${why}] to=${email.to} subject="${email.subject}"\n${email.text}`);
	try {
		if (env.GMAIL_USER) {
			await googleFetch(env.GMAIL_USER, SCOPES.gmail, `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
				method: 'POST',
				body: JSON.stringify({ raw: rawEmail({ from: FROM(), ...email }) })
			});
			return;
		}
		if (env.RESEND_API_KEY) {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					from: FROM(),
					to: [email.to],
					subject: email.subject,
					text: email.text,
					...(email.replyTo ? { reply_to: email.replyTo } : {})
				})
			});
			if (!res.ok) {
				console.error(`[email] Resend failed: ${res.status} ${await res.text()}`);
				log('unsent');
			}
			return;
		}
		log('dev');
	} catch (err) {
		console.error('[email] send error', err);
		log('unsent');
	}
}

export async function notifyNewRequest(r: QuoteRequest, origin: string, manageToken: string): Promise<void> {
	await send(customerConfirmation(r, origin, manageToken));
	if (env.OWNER_EMAIL) await send(ownerAlert(r, origin, env.OWNER_EMAIL));
}

/** Tells the customer and the owner when a booking is rescheduled or cancelled from the customer's link. */
export async function notifyCustomerChange(
	r: QuoteRequest,
	origin: string,
	change: 'rescheduled' | 'cancelled'
): Promise<void> {
	for (const email of changeEmails(r, origin, change, env.OWNER_EMAIL)) await send(email);
}
