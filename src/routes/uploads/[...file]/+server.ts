import type { RequestHandler } from './$types';
import { createReadStream, statSync, openSync, readSync, closeSync, existsSync } from 'fs';
import { join, normalize } from 'path';
import { redirect } from '@sveltejs/kit';
import { Readable } from 'stream';

const uploadsDir = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const filePath = Array.isArray(params.file) 
			? join(uploadsDir, params.file.join('/'))
			: join(uploadsDir, params.file);
		
		const normalizedPath = normalize(filePath);
		if (!normalizedPath.startsWith(uploadsDir)) {
			return new Response('Accès interdit', { status: 403 });
		}
		
		if (!existsSync(normalizedPath)) {
			return new Response('Fichier non trouvé', { status: 404 });
		}

		const stat = statSync(normalizedPath);
		const ext = normalizedPath.split('.').pop()?.toLowerCase();
		let contentType = getContentType(ext);
		
		// Détection du format réel par magic numbers (4 premiers octets uniquement)
		const headerBuffer = Buffer.alloc(4);
		const fd = openSync(normalizedPath, 'r');
		try {
			readSync(fd, headerBuffer, 0, 4, 0);
		} finally {
			closeSync(fd);
		}

		const isPNG = headerBuffer[0] === 0x89 && headerBuffer[1] === 0x50 && headerBuffer[2] === 0x4E && headerBuffer[3] === 0x47;
		const isJPEG = headerBuffer[0] === 0xFF && headerBuffer[1] === 0xD8 && headerBuffer[2] === 0xFF;

		if (isPNG && contentType !== 'image/png') {
			contentType = 'image/png';
		} else if (isJPEG && contentType !== 'image/jpeg') {
			contentType = 'image/jpeg';
		}

		return new Response(Readable.toWeb(createReadStream(normalizedPath)) as unknown as ReadableStream<Uint8Array>, {
			headers: {
				'Content-Type': contentType,
				'Content-Length': stat.size.toString(),
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (error: unknown) {
		if (typeof error === 'object' && error !== null && ('status' in error ? (error as { status?: number }).status === 303 : 'location' in error)) {
			throw error;
		}
		
		return new Response(
			JSON.stringify({ error: 'Erreur interne lors de la lecture du fichier' }), 
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};

function getContentType(ext: string | undefined): string {
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'm4a':
			return 'audio/mp4';
		case 'webm':
			return 'audio/webm';
		case 'gif':
			return 'image/gif';
		default:
			return 'application/octet-stream';
	}
}
