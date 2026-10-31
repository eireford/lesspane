// A minimal plain-text email in RFC 2822 form, base64url-encoded the way the Gmail API's `raw` field wants it.

/** Encodes a header value that may contain non-ASCII (names, the "–" in "3–4") per RFC 2047. */
function header(value: string): string {
	return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

/** Encodes the display name in `Name <addr>` and leaves the address alone. */
function address(value: string): string {
	const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
	return m && m[1] ? `${header(m[1].replace(/^"|"$/g, ''))} <${m[2]}>` : value.trim();
}

export function rawEmail(e: { from: string; to: string; subject: string; text: string; replyTo?: string }): string {
	const lines = [
		`From: ${address(e.from)}`,
		`To: ${address(e.to)}`,
		...(e.replyTo ? [`Reply-To: ${address(e.replyTo)}`] : []),
		`Subject: ${header(e.subject)}`,
		'MIME-Version: 1.0',
		'Content-Type: text/plain; charset=UTF-8',
		'Content-Transfer-Encoding: base64',
		'',
		Buffer.from(e.text, 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n')
	];
	return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}
