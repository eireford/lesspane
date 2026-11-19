import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
