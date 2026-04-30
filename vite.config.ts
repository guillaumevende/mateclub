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
		allowedHosts: true,
		watch: {
			ignored: ['**/.svelte-kit/**', '**/node_modules/**', '**/uploads/**']
		}
	},
	test: {
		alias: {
			'$lib': './src/lib'
		}
	}
});
