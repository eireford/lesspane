// How a request's contact details read in emails, the calendar and the owner's list. Only the email is
// required when booking, so name, phone and address may be blank.

type Contact = { name: string; phone: string; email: string; address: string; zip: string };

/** "Pat" from "Pat Doe", or '' when no name was given. */
export const firstName = (r: Pick<Contact, 'name'>) => r.name.trim().split(/\s+/)[0] ?? '';

/** The name, or the email when there's no name. */
export const displayName = (r: Pick<Contact, 'name' | 'email'>) => r.name.trim() || r.email;

/** "Pat Doe · (410) 555-0100 · pat@example.com", leaving out what wasn't given. */
export const contactLine = (r: Pick<Contact, 'name' | 'phone' | 'email'>) => [r.name, r.phone, r.email].filter(Boolean).join(' · ');

/** "12 Goldsborough St 21601", or '' when neither was given. */
export const place = (r: Pick<Contact, 'address' | 'zip'>) => [r.address, r.zip].filter(Boolean).join(' ');
