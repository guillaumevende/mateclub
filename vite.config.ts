import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		sourcemap: false
	},
	server: {
		fs: {
			allow: ['.', './uploads']
		},
		allowedHosts: true
	},
	test: {
		alias: {
			'$lib': './src/lib'
		}
	}
});
