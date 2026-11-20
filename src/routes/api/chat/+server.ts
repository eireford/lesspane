import { json } from '@sveltejs/kit';
import { assistant, business } from '#lib/config.ts';
import { AssistantError, answer, type ChatMessage } from '#lib/server/assistant/chat.ts';
import { chatLimits as limits, clientIp } from '#lib/server/assistant/limits.ts';
import type { RequestHandler } from './$types';

// POST /api/chat {messages: [{role: "user" | "model", text}]} → 200 {reply} | 4xx/5xx {error}.
// Errors are never passed off as replies (see ../docs/conventions.md in the job-search hub).

/** Model replies run longer than visitor messages; this only stops absurd payloads. */
const MAX_MODEL_TEXT = 6000;

const error = (status: number, message: string, headers: Record<string, string> = {}) =>
	json({ error: message }, { status, headers });

function parseMessages(body: unknown): ChatMessage[] | string {
	const messages = (body as { messages?: unknown } | null)?.messages;
	if (!Array.isArray(messages) || messages.length === 0) return 'Send at least one message.';
	if (messages.length > assistant.maxMessages) {
		return 'This conversation is getting long. Please start a new one.';
	}
	const out: ChatMessage[] = [];
	for (const m of messages) {
		const role = (m as ChatMessage)?.role;
		const text = typeof (m as ChatMessage)?.text === 'string' ? (m as ChatMessage).text.trim() : '';
		if ((role !== 'user' && role !== 'model') || !text) return 'Each message needs a role and some text.';
		if (role === 'user' && text.length > assistant.maxMessageChars) {
			return `Please keep each message under ${assistant.maxMessageChars} characters.`;
		}
		if (text.length > MAX_MODEL_TEXT) return 'A message is too long.';
		out.push({ role, text });
	}
	if (out[out.length - 1].role !== 'user') return 'The last message must be yours.';
	return out;
}

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	// Every request counts, valid or not.
	if (!limits.allowRequest(clientIp(request, getClientAddress))) {
		return error(429, 'Too many messages at once. Please wait a minute and try again.', { 'Retry-After': '60' });
	}
	// Only this site's own pages may use the assistant (it can save bookings).
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) return error(403, 'Not allowed.');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Send JSON.');
	}
	const messages = parseMessages(body);
	if (typeof messages === 'string') return error(400, messages);

	try {
		const reply = await answer(messages, { origin: url.origin, allowModelCall: () => limits.allowModelCall() });
		return json({ reply }, { headers: { 'cache-control': 'no-store' } });
	} catch (e) {
		if (!(e instanceof AssistantError)) throw e;
		return error(
			503,
			e.reason === 'daily_limit'
				? `The assistant has answered all it can for today. You can still get a price and book on this site, or email ${business.contactEmail}.`
				: `The assistant isn't available right now. You can still get a price and book on this site, or email ${business.contactEmail}.`
		);
	}
};
