import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

/** The release version from package.json, shown in the footer of every page. */
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
	define: { __APP_VERSION__: JSON.stringify(version) },
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			// Produces a standalone Node server in ./build, run with `node build` (Cloud Run container).
			adapter: adapter()
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
