import { env } from '$env/dynamic/private';
import { pricing, serviceLabels, timeWindowLabels } from '$lib/config';
import { contactLine, displayName, firstName, place } from '$lib/contact';
import { formatUsd } from '$lib/pricing';
import { googleFetch, SCOPES } from './google';
import { rawEmail } from './mime';
import type { QuoteRequest } from './store';

type Email = { to: string; subject: string; text: string; replyTo?: string };

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

function summary(r: QuoteRequest): string {
	const addOns = r.add_ons.map((a) => pricing.addOns[a].label).join(', ') || 'None';
	return [
		`Address: ${place(r) || 'not given'}`,
		`Home: ${r.stories}-story, about ${r.window_count} windows`,
		`Service: ${serviceLabels[r.service_type]}`,
		`Add-ons: ${addOns}`,
		`Preferred: ${r.preferred_date}, ${timeWindowLabels[r.preferred_window]}`,
		`Quoted price: ${formatUsd(r.quoted_price)}`
	].join('\n');
}

const greeting = (r: QuoteRequest) => (firstName(r) ? `Hi ${firstName(r)},` : 'Hi there,');

const manageLink = (origin: string, token: string) => `${origin}/manage/${token}`;

export async function notifyNewRequest(r: QuoteRequest, origin: string, manageToken: string): Promise<void> {
	await send({
		to: r.email,
		subject: 'We got your LessPane request',
		text: [
			greeting(r),
			'',
			"Thanks for requesting a window cleaning. Here's what you asked for:",
			'',
			summary(r),
			'',
			r.phone ? "We'll text you at the number you gave us to confirm the exact time." : "We'll email you to confirm the exact time.",
			'',
			'Need to change the day or cancel? Use your private link (no account needed):',
			manageLink(origin, manageToken),
			'',
			'Keep this email: anyone with the link can change your booking.',
			'',
			'LessPane'
		].join('\n')
	});

	if (env.OWNER_EMAIL) {
		await send({
			to: env.OWNER_EMAIL,
			replyTo: r.email,
			subject: `New request: ${formatUsd(r.quoted_price)} on ${r.preferred_date}`,
			text: [
				contactLine(r),
				'',
				summary(r),
				'',
				`Notes: ${r.notes || '(none)'}`,
				'',
				`All requests: ${origin}/admin`
			].join('\n')
		});
	}
}

/** Tells the customer and the owner when a booking is rescheduled or cancelled from the customer's link. */
export async function notifyCustomerChange(
	r: QuoteRequest,
	origin: string,
	change: 'rescheduled' | 'cancelled'
): Promise<void> {
	const what =
		change === 'cancelled'
			? 'Your window cleaning request is cancelled.'
			: `Your window cleaning is now requested for ${r.preferred_date}, ${timeWindowLabels[r.preferred_window].toLowerCase()}.`;

	await send({
		to: r.email,
		subject: change === 'cancelled' ? 'Your LessPane request is cancelled' : 'Your LessPane request has a new time',
		text: [
			greeting(r),
			'',
			what,
			change === 'cancelled' ? 'Changed your mind? Start a new request any time.' : `We'll ${r.phone ? 'text' : 'email'} you to confirm the exact time.`,
			'',
			change === 'cancelled' ? origin : summary(r),
			'',
			'LessPane'
		].join('\n')
	});

	if (env.OWNER_EMAIL) {
		await send({
			to: env.OWNER_EMAIL,
			replyTo: r.email,
			subject:
				change === 'cancelled'
					? `Cancelled by customer: ${displayName(r)}, ${r.preferred_date}`
					: `Rescheduled by customer: ${displayName(r)}, now ${r.preferred_date} ${r.preferred_window}`,
			text: [contactLine(r), '', summary(r), '', `All requests: ${origin}/admin`].join('\n')
		});
	}
}
