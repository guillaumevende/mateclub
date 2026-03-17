import { readFileSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const faviconPath = join(process.cwd(), 'static', 'favicon.ico');
	
	const favicon = readFileSync(faviconPath);
	
	return new Response(favicon, {
		headers: {
			'Content-Type': 'image/x-icon',
			'Cache-Control': 'public, max-age=604800'
		}
	});
};
