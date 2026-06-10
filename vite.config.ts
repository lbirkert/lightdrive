import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: [
			{ find: /^flewui$/, replacement: new URL('../../src/lib/index.ts', import.meta.url).pathname },
			{ find: /^flewui\/styles$/, replacement: new URL('../../src/lib/styles/tokens.css', import.meta.url).pathname },
			{ find: /^flewui\/(.+)$/, replacement: '../../src/lib/$1' }
		]
	}
});
