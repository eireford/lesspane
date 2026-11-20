// Turns the assistant's plain-text replies into blocks the chat panel renders as Svelte elements (never as HTML),
// so nothing in a reply can inject markup. Understands paragraphs, "- " bullets, **bold**, *italic*, bare
// http(s) links and Markdown links [text](https://...).

export type Inline = { kind: 'text' | 'bold' | 'em'; text: string } | { kind: 'link'; text: string; href: string };
export type Block = { kind: 'p'; parts: Inline[] } | { kind: 'ul'; items: Inline[][] };

const LINK = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/;
const MD_LINK = /(\[[^\]]+\]\(https?:\/\/[^\s()]+\))/;

/** Plain text and bare links. */
function linkParts(chunk: string, kind: 'text' | 'bold' | 'em'): Inline[] {
	const parts: Inline[] = [];
	// split() with a capture group puts the links at the odd indexes.
	chunk.split(LINK).forEach((piece, i) => {
		if (piece) parts.push(i % 2 === 1 ? { kind: 'link', text: piece, href: piece } : { kind, text: piece });
	});
	return parts;
}

function inlineParts(line: string): Inline[] {
	const parts: Inline[] = [];
	for (const chunk of line.split(MD_LINK)) {
		if (!chunk) continue;
		const md = chunk.match(/^\[([^\]]+)\]\((https?:\/\/[^\s()]+)\)$/);
		if (md) {
			parts.push({ kind: 'link', text: md[1], href: md[2] });
			continue;
		}
		for (const piece of chunk.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/)) {
			if (!piece) continue;
			if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) parts.push(...linkParts(piece.slice(2, -2), 'bold'));
			else if (piece.startsWith('*') && piece.endsWith('*') && piece.length > 2) parts.push(...linkParts(piece.slice(1, -1), 'em'));
			else parts.push(...linkParts(piece, 'text'));
		}
	}
	return parts;
}

export function formatChat(text: string): Block[] {
	const blocks: Block[] = [];
	for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
		const line = raw.trim();
		if (!line) {
			blocks.push({ kind: 'p', parts: [] });
			continue;
		}
		const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
		const last = blocks[blocks.length - 1];
		if (bullet) {
			if (last?.kind === 'ul') last.items.push(inlineParts(bullet[1]));
			else blocks.push({ kind: 'ul', items: [inlineParts(bullet[1])] });
		} else if (last?.kind === 'p' && last.parts.length) {
			last.parts.push({ kind: 'text', text: ' ' }, ...inlineParts(line));
		} else if (last?.kind === 'p') {
			last.parts.push(...inlineParts(line));
		} else {
			blocks.push({ kind: 'p', parts: inlineParts(line) });
		}
	}
	return blocks.filter((b) => b.kind === 'ul' || b.parts.length);
}
