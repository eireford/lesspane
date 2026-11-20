// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	/** The release version from package.json, replaced at build time (vite.config.ts). */
	const __APP_VERSION__: string;

	namespace App {
		// interface Error {}
		interface Locals {
			/** The signed-in owner's email on /admin (Google sign-in only). */
			admin?: string | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
