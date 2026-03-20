import type { RequestHandler } from './$types';
import { existsSync, readFileSync } from 'fs';
import { join, normalize } from 'path';

export const GET: RequestHandler = async ({ params, locals }) => {
	// Vérifier l'authentification
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const pathSegments = params.path?.split('/') || [];
	const filename = pathSegments[pathSegments.length - 1];
	const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
	const filepath = join(avatarsDir, ...pathSegments);
	
	// Validation contre path traversal
	const normalizedPath = normalize(filepath);
	if (!normalizedPath.startsWith(avatarsDir)) {
		return new Response('Forbidden', { status: 403 });
	}
	
	if (!existsSync(normalizedPath)) {
		return new Response('Not found', { status: 404 });
	}

	const fileBuffer = readFileSync(normalizedPath);
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
