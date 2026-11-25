import { business, pricing, serviceLabels, timeWindowLabels } from '#lib/config.ts';
import { contactLine, displayName, firstName, place } from '#lib/contact.ts';
import { formatUsd } from '#lib/pricing.ts';
import type { QuoteRequest } from './store';

// The words of every email LessPane sends, kept apart from the sending (email.ts) so the demo's owner view and
// the thanks page can show exactly what the app sends, with no way to send anything.

export type Email = { to: string; subject: string; text: string; replyTo?: string };

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

/** The customer's confirmation, with their private manage link. */
export function customerConfirmation(r: QuoteRequest, origin: string, manageToken: string): Email {
	return {
		to: r.email,
		subject: 'We got your LessPane request',
		text: [
			greeting(r),
			'',
			"Thanks for requesting a window cleaning. Here's what you asked for:",
			'',
			summary(r),
			'',
			business.showcase.enabled
				? `LessPane is a demo built by ${business.showcase.builtBy} (${business.showcase.builtByUrl}), so no one will come to clean.`
				: r.phone
					? "We'll text you at the number you gave us to confirm the exact time."
					: "We'll email you to confirm the exact time.",
			'',
			'Need to change the day or cancel? Use your private link (no account needed):',
			manageLink(origin, manageToken),
			'',
			'Keep this email: anyone with the link can change your booking.',
			'',
			'LessPane'
		].join('\n')
	};
}

/** The owner's alert for a new request. Replying goes straight to the customer. */
export function ownerAlert(r: QuoteRequest, origin: string, ownerEmail: string): Email {
	return {
		to: ownerEmail,
		replyTo: r.email,
		subject: `New request: ${formatUsd(r.quoted_price)} on ${r.preferred_date}`,
		text: [contactLine(r), '', summary(r), '', `Notes: ${r.notes || '(none)'}`, '', `All requests: ${origin}/admin`].join('\n')
	};
}

/** The customer's and the owner's emails when the customer reschedules or cancels from their link. */
export function changeEmails(r: QuoteRequest, origin: string, change: 'rescheduled' | 'cancelled', ownerEmail?: string): Email[] {
	const what =
		change === 'cancelled'
			? 'Your window cleaning request is cancelled.'
			: `Your window cleaning is now requested for ${r.preferred_date}, ${timeWindowLabels[r.preferred_window].toLowerCase()}.`;

	const emails: Email[] = [
		{
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
		}
	];

	if (ownerEmail) {
		emails.push({
			to: ownerEmail,
			replyTo: r.email,
			subject:
				change === 'cancelled'
					? `Cancelled by customer: ${displayName(r)}, ${r.preferred_date}`
					: `Rescheduled by customer: ${displayName(r)}, now ${r.preferred_date} ${r.preferred_window}`,
			text: [contactLine(r), '', summary(r), '', `All requests: ${origin}/admin`].join('\n')
		});
	}
	return emails;
}
