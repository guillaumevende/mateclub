import type { RequestHandler } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join, normalize } from 'path';
import { redirect } from '@sveltejs/kit';

const uploadsDir = join(process.cwd(), 'uploads');

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		// Vérifier l'authentification - les fichiers ne sont accessibles qu'aux utilisateurs connectés
		if (!locals.user) {
			console.log('[uploads] Accès refusé - utilisateur non authentifié');
			throw redirect(303, '/login');
		}

		// Construire le chemin du fichier
		// params.file peut être un tableau (rest parameter) ou une chaîne
		const filePath = Array.isArray(params.file) 
			? join(uploadsDir, params.file.join('/'))
			: join(uploadsDir, params.file);
		
		// Validation contre path traversal
		const normalizedPath = normalize(filePath);
		if (!normalizedPath.startsWith(uploadsDir)) {
			console.log('[uploads] Path traversal détecté:', normalizedPath);
			return new Response('Accès interdit', { status: 403 });
		}
		
		console.log('[uploads] Chemin demandé:', normalizedPath);
		console.log('[uploads] params.file:', params.file, '(type:', typeof params.file + ')');

		// Vérifier l'existence du fichier
		if (!existsSync(normalizedPath)) {
			console.log('[uploads] Fichier non trouvé:', normalizedPath);
			return new Response('Fichier non trouvé', { status: 404 });
		}

		// Lire le fichier
		console.log('[uploads] Lecture du fichier:', normalizedPath);
		const buffer = readFileSync(normalizedPath);
		console.log('[uploads] Fichier lu, taille:', buffer.length, 'bytes');

		// Déterminer le Content-Type
		const ext = normalizedPath.split('.').pop()?.toLowerCase();
		let contentType = getContentType(ext);
		
		// Détection du format réel par magic numbers pour les images
		if (buffer.length > 0) {
			const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
			const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
			
			if (isPNG && contentType !== 'image/png') {
				console.log('[uploads] Fichier PNG détecté mais extension différente, correction du Content-Type');
				contentType = 'image/png';
			} else if (isJPEG && contentType !== 'image/jpeg') {
				console.log('[uploads] Fichier JPEG détecté mais extension différente, correction du Content-Type');
				contentType = 'image/jpeg';
			}
		}
		
		console.log('[uploads] Content-Type:', contentType, '(extension:', ext + ')');

		// Retourner le fichier avec cache privé (uniquement pour l'utilisateur authentifié)
		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	} catch (error: unknown) {
		console.error('[uploads] Erreur lors du traitement de la requête:', error);
		console.error('[uploads] Type d\'erreur:', error && typeof error === 'object' && 'constructor' in error ? (error as any).constructor.name : 'unknown');
		console.error('[uploads] Message:', error && typeof error === 'object' && 'message' in error ? (error as any).message : 'unknown');
		
		// Si c'est une redirection, la propager
		if (typeof error === 'object' && error !== null && ('status' in error ? (error as any).status === 303 : 'location' in error)) {
			throw error;
		}
		
		// Sinon, retourner une erreur 500 générique (pas de fuite d'information)
		return new Response(
			JSON.stringify({ 
				error: 'Erreur interne lors de la lecture du fichier'
			}), 
			{ 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
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
