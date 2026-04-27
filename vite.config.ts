import { existsSync, realpathSync } from 'node:fs';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

const fsAllow = ['.', './uploads'];
const nodeModulesRealPath = (() => {
	try {
		return existsSync('node_modules') ? realpathSync('node_modules') : null;
	} catch {
		return null;
	}
})();

if (nodeModulesRealPath) {
	fsAllow.push(nodeModulesRealPath);
}

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		sourcemap: false
	},
	server: {
		fs: {
			allow: fsAllow
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
