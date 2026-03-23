/**
 * Debug utility for development and production logging control
 * 
 * Usage:
 *   import { debug } from '$lib/debug';
 *   
 *   debug.log('message');           // Only in dev
 *   debug.player.log('state');      // Player module
 *   debug.recording.log('saved');   // Recording module
 *   debug.upload.log('path');       // Upload module
 *   debug.db.log('query');         // Database module
 */

const isDev = process.env.NODE_ENV !== 'production';

function createLogger(prefix: string) {
	return {
		log: (...args: unknown[]) => {
			if (isDev) {
				console.log(`[${prefix}]`, ...args);
			}
		},
		error: (...args: unknown[]) => {
			console.error(`[${prefix}]`, ...args);
		}
	};
}

export const debug = {
	log: (...args: unknown[]) => {
		if (isDev) {
			console.log('[DEBUG]', ...args);
		}
	},

	error: (...args: unknown[]) => {
		console.error('[ERROR]', ...args);
	},

	player: createLogger('PLAYER'),
	recording: createLogger('RECORDING'),
	upload: createLogger('UPLOAD'),
	db: createLogger('DB'),
	api: createLogger('API'),
	wakeLock: createLogger('WAKE_LOCK'),
	send: createLogger('SEND'),
	effect: createLogger('EFFECT')
};

export default debug;
