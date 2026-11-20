import { describe, expect, it } from 'vitest';
import { formatChat } from './chat-format';

describe('formatChat', () => {
	it('splits paragraphs and bullets, and finds bold and links', () => {
		const blocks = formatChat('Your price is **$185**.\n\n- Outside only\n- 2 floors\nManage it: https://lesspane.com/manage/abc.');
		expect(blocks).toEqual([
			{ kind: 'p', parts: [{ kind: 'text', text: 'Your price is ' }, { kind: 'bold', text: '$185' }, { kind: 'text', text: '.' }] },
			{
				kind: 'ul',
				items: [[{ kind: 'text', text: 'Outside only' }], [{ kind: 'text', text: '2 floors' }]]
			},
			{
				kind: 'p',
				parts: [
					{ kind: 'text', text: 'Manage it: ' },
					{ kind: 'link', text: 'https://lesspane.com/manage/abc', href: 'https://lesspane.com/manage/abc' },
					{ kind: 'text', text: '.' }
				]
			}
		]);
	});

	it('reads Markdown links and italics the model sometimes writes', () => {
		const [block] = formatChat('*Demo only.* Use [your link](https://lesspane.com/manage/abc) or https://x.co/a.');
		expect(block).toEqual({
			kind: 'p',
			parts: [
				{ kind: 'em', text: 'Demo only.' },
				{ kind: 'text', text: ' Use ' },
				{ kind: 'link', text: 'your link', href: 'https://lesspane.com/manage/abc' },
				{ kind: 'text', text: ' or ' },
				{ kind: 'link', text: 'https://x.co/a', href: 'https://x.co/a' },
				{ kind: 'text', text: '.' }
			]
		});
	});

	it('does not turn javascript: Markdown links into links', () => {
		const [block] = formatChat('[click](javascript:alert(1))');
		expect(block.kind === 'p' && block.parts.every((p) => p.kind !== 'link')).toBe(true);
	});

	it('leaves markup as plain text and ignores non-http links', () => {
		const [block] = formatChat('<img src=x onerror=alert(1)> javascript:alert(1)');
		expect(block).toEqual({ kind: 'p', parts: [{ kind: 'text', text: '<img src=x onerror=alert(1)> javascript:alert(1)' }] });
	});
});
