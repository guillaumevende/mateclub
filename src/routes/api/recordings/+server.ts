import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { saveRecording, getRecentRecordingByUser } from '$lib/server/db';
import { isValidAudioBuffer } from '$lib/server/fileValidation';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const formData = await request.formData();
	const audio = formData.get('audio') as File;
	const duration = formData.get('duration')?.toString();
	const image = formData.get('image') as File | null;
	const url = formData.get('url')?.toString();

	if (!audio || audio.size === 0) {
		return json({ error: 'Audio requis' }, { status: 400 });
	}

	// Validate URL if provided
	if (url && url.trim() !== '') {
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:') {
				return json({ error: 'L\'URL doit commencer par https://' }, { status: 400 });
			}
		} catch {
			return json({ error: 'URL invalide' }, { status: 400 });
		}
	}

	const durationSeconds = parseInt(duration || '0', 10);
	if (durationSeconds > 180) {
		return json({ error: 'Durée maximale: 3 minutes' }, { status: 400 });
	}

	// Validate audio size (20MB max for 3 minutes)
	const maxAudioSize = 20 * 1024 * 1024;
	if (audio.size > maxAudioSize) {
		return json({ error: 'Fichier audio trop volumineux (max 20 Mo)' }, { status: 400 });
	}

	// Validate audio content by magic numbers
	const audioBuffer = Buffer.from(await audio.arrayBuffer());
	if (!isValidAudioBuffer(audioBuffer)) {
		return json({ error: 'Format audio non valide. Utilisez WebM, MP4/M4A, OGG ou MP3.' }, { status: 400 });
	}

	// Vérifier si un enregistrement similaire existe déjà (déduplication)
	const recentRecording = getRecentRecordingByUser(locals.user.id, durationSeconds, 5);
	if (recentRecording) {
		// Retourner l'enregistrement existant au lieu d'en créer un nouveau
		return json({ 
			id: recentRecording.id,
			duplicate: true,
			message: 'Enregistrement déjà existant'
		});
	}

	// Reuse the already-read buffer
	const buffer = audioBuffer;
	
	let imageBuffer: Buffer | undefined;
	if (image && image.size > 0) {
		imageBuffer = Buffer.from(await image.arrayBuffer());
	}

	const recording = saveRecording(locals.user.id, buffer, durationSeconds, imageBuffer, url || null);

	return json({ id: recording.id });
};
