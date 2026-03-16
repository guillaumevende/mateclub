import type { RequestHandler } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { redirect } from '@sveltejs/kit';

const uploadsDir = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async ({ params, locals }) => {
	// Vérifier l'authentification - les fichiers ne sont accessibles qu'aux utilisateurs connectés
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Construire le chemin du fichier
	const filePath = join(uploadsDir, params.file.join('/'));

	// Vérifier l'existence du fichier
	if (!existsSync(filePath)) {
		return new Response('Fichier non trouvé', { status: 404 });
	}

	// Lire le fichier
	const buffer = readFileSync(filePath);

	// Déterminer le Content-Type
	const ext = filePath.split('.').pop()?.toLowerCase();
	const contentType = getContentType(ext);

	// Retourner le fichier avec cache privé (uniquement pour l'utilisateur authentifié)
	return new Response(buffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, max-age=3600'
		}
	});
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
