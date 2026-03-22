import type { RequestHandler } from './$types';
import { json, redirect } from '@sveltejs/kit';
import { updateUserAvatarImage, getUserAvatar } from '$lib/server/db';
import { writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { isValidImageBuffer } from '$lib/server/fileValidation';
import sharp from 'sharp';

const uploadsDir = join(process.cwd(), 'uploads', 'avatars');

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	try {
		const formData = await request.formData();
		const image = formData.get('image') as File | null;

		if (!image || image.size === 0) {
			return json({ error: 'Image requise' }, { status: 400 });
		}

		// Validation du type MIME (inclut HEIC/HEIF et image/jpg)
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
		if (!validTypes.includes(image.type)) {
			return json({ error: 'Format accepté: JPG, PNG, WEBP, HEIC' }, { status: 400 });
		}

		// Validation de la taille (10 Mo max)
		const maxSize = 10 * 1024 * 1024;
		if (image.size > maxSize) {
			return json({ error: 'Taille maximale: 10 Mo' }, { status: 400 });
		}

		// Récupération du buffer
		let imageBuffer = Buffer.from(await image.arrayBuffer());

		// Validation du contenu par magic numbers
		if (!isValidImageBuffer(imageBuffer)) {
			return json({ error: 'Le fichier ne semble pas être une image valide' }, { status: 400 });
		}

		// Conversion HEIC/HEIF en JPEG si nécessaire
		const isHeic = image.type === 'image/heic' || image.type === 'image/heif';
		if (isHeic) {
			try {
				const convertedBuffer = await sharp(imageBuffer)
					.rotate() // Respecte l'orientation EXIF
					.jpeg({ quality: 90 })
					.toBuffer();
				imageBuffer = Buffer.from(convertedBuffer);
			} catch (err) {
				console.error('Erreur conversion HEIC:', err);
				return json({ error: 'Erreur lors de la conversion de l\'image HEIC' }, { status: 400 });
			}
		}

		// Dossier spécifique à l'utilisateur
		const userDir = join(uploadsDir, locals.user.id.toString());
		if (!existsSync(userDir)) {
			mkdirSync(userDir, { recursive: true });
		}

		// Supprimer toutes les anciennes images de l'utilisateur
		try {
			const files = readdirSync(userDir);
			for (const file of files) {
				if (file.startsWith('avatar_')) {
					unlinkSync(join(userDir, file));
				}
			}
		} catch (e) {
			// Dossier vide ou inexistant
		}

		// Générer un nom de fichier unique
		const timestamp = Date.now();
		const filename = `avatar_${timestamp}_${crypto.randomUUID()}.jpg`;
		const filepath = join(userDir, filename);

		// Écrire le fichier (converti ou original)
		writeFileSync(filepath, imageBuffer);

		// Mettre à jour la base de données avec le chemin complet relatif
		const dbPath = `${locals.user.id}/${filename}`;
		updateUserAvatarImage(locals.user.id, dbPath);

		return json({ success: true, filename: dbPath });
	} catch (error) {
		console.error('Erreur upload avatar:', error);
		return json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	try {
		const currentAvatar = getUserAvatar(locals.user.id);
		
		// Supprimer le fichier image s'il existe
		if (currentAvatar && currentAvatar.includes('/')) {
			const filepath = join(uploadsDir, currentAvatar);
			if (existsSync(filepath)) {
				unlinkSync(filepath);
			}
		}

		return json({ success: true });
	} catch (error) {
		console.error('Erreur suppression avatar:', error);
		return json({ error: 'Erreur lors de la suppression' }, { status: 500 });
	}
};
