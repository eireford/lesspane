import { defineEnvVars } from '@sveltejs/kit/env';

/** Every environment variable the app reads. All are server-only and read when the app starts. See .env.example. */
const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	STORAGE: {
		description: 'Where quote requests are stored: "file" (local .data/requests.json) or "firestore".',
		schema: (value) => {
			if (value && value !== 'file' && value !== 'firestore') throw new Error('STORAGE must be "file" or "firestore"');
			return value || undefined;
		}
	},
	GOOGLE_CLOUD_PROJECT: { description: 'Firestore project outside Google Cloud.', schema: optional },
	FIRESTORE_DATABASE: { description: 'Named Firestore database; empty means "(default)".', schema: optional },
	APP_ENV: { description: '"staging" adds a noindex header.', schema: optional },
	ADMIN_PASSWORD: { description: 'HTTP Basic password for /admin when Google sign-in is off.', schema: optional },
	RESEND_API_KEY: { description: 'Resend key; empty logs emails to the console.', schema: optional },
	EMAIL_FROM: { description: 'Sender address for notifications.', schema: optional },
	OWNER_EMAIL: { description: 'Where new-request alerts go.', schema: optional },
	GMAIL_USER: { description: 'Workspace user to send Gmail as (domain-wide delegation).', schema: optional },
	CALENDAR_USER: { description: 'Workspace user whose calendar gets bookings.', schema: optional },
	CALENDAR_ID: { description: 'Calendar for bookings; default the user\'s primary.', schema: optional },
	GOOGLE_CLIENT_ID: { description: 'OAuth client for /admin Google sign-in.', schema: optional },
	GOOGLE_CLIENT_SECRET: { description: 'OAuth client secret for /admin Google sign-in.', schema: optional },
	SESSION_SECRET: { description: 'Signs the /admin session cookie.', schema: optional },
	ADMIN_EMAILS: { description: 'Comma-separated addresses allowed into /admin.', schema: optional }
});
