import { env } from '$env/dynamic/private';
import { pricing, serviceLabels, timeWindowLabels } from '$lib/config';
import { formatUsd } from '$lib/pricing';
import type { QuoteRequest } from './store';

type Email = { to: string; subject: string; text: string; replyTo?: string };

/**
 * Sends through Resend's HTTP API. Without RESEND_API_KEY it logs instead,
 * so local development works with no email account.
 * Never throws: a failed email must not lose a booking request.
 */
async function send(email: Email): Promise<void> {
	if (!env.RESEND_API_KEY) {
		console.info(`[email:dev] to=${email.to} subject="${email.subject}"\n${email.text}`);
		return;
	}
	try {
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: env.EMAIL_FROM || 'LessPane <hello@lesspane.com>',
				to: [email.to],
				subject: email.subject,
				text: email.text,
				...(email.replyTo ? { reply_to: email.replyTo } : {})
			})
		});
		if (!res.ok) console.error(`[email] send failed: ${res.status} ${await res.text()}`);
	} catch (err) {
		console.error('[email] send error', err);
	}
}

function summary(r: QuoteRequest): string {
	const addOns = r.add_ons.map((a) => pricing.addOns[a].label).join(', ') || 'None';
	return [
		`Address: ${r.address} ${r.zip}`,
		`Home: ${r.stories}-story, about ${r.window_count} windows`,
		`Service: ${serviceLabels[r.service_type]}`,
		`Add-ons: ${addOns}`,
		`Preferred: ${r.preferred_date}, ${timeWindowLabels[r.preferred_window]}`,
		`Quoted price: ${formatUsd(r.quoted_price)}`
	].join('\n');
}

export async function notifyNewRequest(r: QuoteRequest, origin: string): Promise<void> {
	const firstName = r.name.split(' ')[0];

	await send({
		to: r.email,
		subject: 'We got your LessPane request',
		text: [
			`Hi ${firstName},`,
			'',
			"Thanks for requesting a window cleaning. Here's what you asked for:",
			'',
			summary(r),
			'',
			"We'll text you at the number you gave us to confirm the exact time.",
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
				`${r.name} · ${r.phone} · ${r.email}`,
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
