import type { RequestHandler } from './$types';
import { existsSync, createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import { join, normalize } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.file;
	
	// Path traversal protection
	// 1. Block path traversal sequences
	if (filename.includes('..') || filename.includes('//') || filename.startsWith('/')) {
		return new Response('Accès refusé', { status: 403 });
	}
	
	// 2. Normalize and validate path
	const filepath = normalize(join(UPLOADS_DIR, filename));
	
	// 3. Ensure the resolved path is still within UPLOADS_DIR
	if (!filepath.startsWith(UPLOADS_DIR)) {
		return new Response('Accès refusé', { status: 403 });
	}
	
	// 4. Additional check: filename should not contain backslashes (Windows)
	if (filename.includes('\\')) {
		return new Response('Accès refusé', { status: 403 });
	}
	
	if (!existsSync(filepath)) {
		return new Response('Not found', { status: 404 });
	}

	const stat = statSync(filepath);
	const ext = filename.split('.').pop()?.toLowerCase();
	const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
					   ext === 'png' ? 'image/png' : 
					   ext === 'gif' ? 'image/gif' : 'image/jpeg';

	return new Response(Readable.toWeb(createReadStream(filepath)) as unknown as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': stat.size.toString(),
			'Accept-Ranges': 'bytes',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
};
