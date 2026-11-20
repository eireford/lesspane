import * as env from '$app/env/private';
import type { Content, FunctionCall, GoogleGenAI } from '@google/genai';
import { assistant } from '#lib/config.ts';
import { systemInstruction } from './knowledge.ts';
import { runTool, toolDeclarations, type ToolContext } from './tools.ts';

// One chat turn: send the conversation to Gemini, run any tools it asks for (estimate, ZIP check, booking),
// and return its answer. The browser keeps the conversation and sends it whole each turn.

export type ChatMessage = { role: 'user' | 'model'; text: string };

/** Gemini could not produce an answer (failure, empty reply, or the daily limit). */
export class AssistantError extends Error {
	constructor(
		message: string,
		readonly reason: 'unavailable' | 'daily_limit' = 'unavailable'
	) {
		super(message);
	}
}

/** What one model call returns; the subset of GenerateContentResponse the loop uses. */
export type ModelReply = { text?: string; functionCalls?: FunctionCall[]; content?: Content };
export type Generate = (contents: Content[], system: string) => Promise<ModelReply>;

let client: GoogleGenAI | null = null;

/** The real model: Gemini on Vertex AI with the runtime account's credentials. */
const gemini: Generate = async (contents, system) => {
	if (!client) {
		const { GoogleGenAI } = await import('@google/genai');
		client = new GoogleGenAI({
			vertexai: true,
			project: env.GOOGLE_CLOUD_PROJECT,
			location: env.GOOGLE_CLOUD_LOCATION ?? assistant.location
		});
	}
	const response = await client.models.generateContent({
		model: env.GEMINI_MODEL ?? assistant.model,
		contents,
		config: {
			systemInstruction: system,
			tools: [{ functionDeclarations: toolDeclarations }],
			maxOutputTokens: assistant.maxOutputTokens,
			temperature: assistant.temperature
		}
	});
	return { text: response.text, functionCalls: response.functionCalls, content: response.candidates?.[0]?.content };
};

export async function answer(
	messages: ChatMessage[],
	options: { origin: string; allowModelCall: () => boolean; generate?: Generate; now?: Date }
): Promise<string> {
	const generate = options.generate ?? gemini;
	const system = systemInstruction(options.now);
	const contents: Content[] = messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
	const ctx: ToolContext = { origin: options.origin, booked: false };

	for (let round = 0; ; round++) {
		if (!options.allowModelCall()) throw new AssistantError('Daily limit reached', 'daily_limit');

		let reply: ModelReply;
		try {
			reply = await generate(contents, system);
		} catch (e) {
			console.error('Gemini request failed', e);
			throw new AssistantError('Gemini request failed');
		}

		const calls = reply.functionCalls ?? [];
		if (!calls.length) {
			const text = reply.text?.trim();
			if (!text) throw new AssistantError('Gemini returned no text');
			return text;
		}
		if (round >= assistant.maxToolRounds) throw new AssistantError('Too many tool rounds');

		// Keep the model's own turn (it carries the call and any thought signatures), then answer every call.
		contents.push(reply.content ?? { role: 'model', parts: calls.map((functionCall) => ({ functionCall })) });
		const parts = [];
		for (const call of calls) {
			let response: Record<string, unknown>;
			try {
				response = await runTool(call.name, (call.args ?? {}) as Record<string, unknown>, ctx);
			} catch (e) {
				console.error(`Assistant tool ${call.name} failed`, e);
				response = { ok: false, error: 'That did not work on our side. Suggest trying again or using the booking page.' };
			}
			parts.push({ functionResponse: { id: call.id, name: call.name, response } });
		}
		contents.push({ role: 'user', parts });
	}
}
