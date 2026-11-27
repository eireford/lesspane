// "Did you mean …?" for the commonest misspelled email domains. A typo here means the customer never gets their
// confirmation or the link to change the booking, so the booking form offers a one-tap fix. Never blocks: an
// unusual domain may be right.

const FIXES: Record<string, string> = {
	'gmial.com': 'gmail.com',
	'gmai.com': 'gmail.com',
	'gamil.com': 'gmail.com',
	'gnail.com': 'gmail.com',
	'gmaill.com': 'gmail.com',
	'gmail.co': 'gmail.com',
	'gmail.con': 'gmail.com',
	'gmail.cmo': 'gmail.com',
	'hotmial.com': 'hotmail.com',
	'hotmal.com': 'hotmail.com',
	'hotmail.co': 'hotmail.com',
	'hotmail.con': 'hotmail.com',
	'yaho.com': 'yahoo.com',
	'yahooo.com': 'yahoo.com',
	'yahoo.co': 'yahoo.com',
	'yahoo.con': 'yahoo.com',
	'outlok.com': 'outlook.com',
	'outloo.com': 'outlook.com',
	'outlook.co': 'outlook.com',
	'iclod.com': 'icloud.com',
	'icoud.com': 'icloud.com',
	'icloud.co': 'icloud.com',
	'aol.co': 'aol.com',
	'comcast.ent': 'comcast.net',
	'verizon.ent': 'verizon.net'
};

/** The corrected address if the domain is a known misspelling, otherwise null. */
export function suggestEmail(email: string): string | null {
	const at = email.trim().lastIndexOf('@');
	if (at < 1) return null;
	const local = email.trim().slice(0, at);
	const domain = email.trim().slice(at + 1).toLowerCase();
	const fix = FIXES[domain];
	return fix ? `${local}@${fix}` : null;
}
