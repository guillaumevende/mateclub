import type { RequestHandler } from './$types';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const pathSegments = params.path?.split('/') || [];
	const filename = pathSegments[pathSegments.length - 1];
	const filepath = join(process.cwd(), 'uploads', 'avatars', ...pathSegments);
	
	if (!existsSync(filepath)) {
		return new Response('Not found', { status: 404 });
	}

	const fileBuffer = readFileSync(filepath);
	const ext = filename.split('.').pop()?.toLowerCase();
	const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
					   ext === 'png' ? 'image/png' : 
					   ext === 'gif' ? 'image/gif' : 'image/jpeg';

	return new Response(fileBuffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
