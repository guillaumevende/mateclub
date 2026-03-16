import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { updateUserAvatarImage, getUserAvatar } from '$lib/server/db';
import { existsSync } from 'fs';
import { join } from 'path';

const uploadsDir = join(process.cwd(), 'uploads', 'avatars');

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	try {
		const { filename } = await request.json();
		
		// Le filename doit contenir userId/nomdefichier
		if (!filename || !filename.includes('/')) {
			return json({ error: 'Nom de fichier invalide' }, { status: 400 });
		}

		// Vérifier que le fichier appartient à l'utilisateur
		const userIdFromPath = filename.split('/')[0];
		if (userIdFromPath !== locals.user.id.toString()) {
			return json({ error: 'Accès non autorisé' }, { status: 403 });
		}

		// Vérifier que le fichier existe
		const filepath = join(uploadsDir, filename);
		if (!existsSync(filepath)) {
			return json({ error: 'Image introuvable' }, { status: 404 });
		}

		// Mettre à jour la base de données
		updateUserAvatarImage(locals.user.id, filename);

		return json({ success: true, filename });
	} catch (error) {
		console.error('Erreur restauration avatar:', error);
		return json({ error: 'Erreur lors de la restauration' }, { status: 500 });
	}
};
