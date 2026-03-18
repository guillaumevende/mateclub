import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { saveRecording, getRecentRecordingByHash } from '$lib/server/db';
import { isValidAudioBuffer, isValidImageBuffer } from '$lib/server/fileValidation';
import crypto from 'crypto';

console.log('[RECORDINGS] Module loaded, attempting sharp import...');
import sharp from 'sharp';
console.log('[RECORDINGS] Sharp loaded successfully:', typeof sharp);

const DUPLICATE_THRESHOLD_SECONDS = 30;

export const config = {
	body: {
		max: 20 * 1024 * 1024 // 20 MB - allows 3min audio + image
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	console.log('[RECORDINGS] ============================================');
	console.log('[RECORDINGS] POST request received');
	
	try {
		if (!locals.user) {
			console.log('[RECORDINGS] No user in locals, throwing redirect to /login');
			throw redirect(303, '/login');
		}
		console.log('[RECORDINGS] User authenticated:', locals.user.id, locals.user.pseudo);

		console.log('[RECORDINGS] Parsing formData...');
		let formData;
		try {
			formData = await request.formData();
			console.log('[RECORDINGS] formData parsed successfully');
		} catch (err) {
			console.error('[RECORDINGS] ERROR parsing formData:', err);
			return json({ error: 'Erreur lors de la lecture des données: ' + (err as Error).message }, { status: 400 });
		}

		const audio = formData.get('audio') as File;
		const duration = formData.get('duration')?.toString();
		const image = formData.get('image') as File | null;
		const url = formData.get('url')?.toString();

		console.log('[RECORDINGS] Form fields extracted:');
		console.log('[RECORDINGS]   - audio:', audio ? `${audio.size} bytes, type: ${audio.type}` : 'null');
		console.log('[RECORDINGS]   - duration:', duration);
		console.log('[RECORDINGS]   - image:', image ? `${image.size} bytes, type: ${image.type}` : 'null');
		console.log('[RECORDINGS]   - url:', url || 'null');

		if (!audio || audio.size === 0) {
			console.error('[RECORDINGS] Audio vide ou absent');
			return json({ error: 'Audio requis' }, { status: 400 });
		}

		console.log('[RECORDINGS] Audio validation passed');

		if (url && url.trim() !== '') {
			try {
				const parsed = new URL(url);
				if (parsed.protocol !== 'https:') {
					console.error('[RECORDINGS] URL non https:', parsed.protocol);
					return json({ error: 'L\'URL doit commencer par https://' }, { status: 400 });
				}
				console.log('[RECORDINGS] URL validée:', parsed.href);
			} catch {
				console.error('[RECORDINGS] URL invalide:', url);
				return json({ error: 'URL invalide' }, { status: 400 });
			}
		}

		const durationSeconds = parseInt(duration || '0', 10);
		console.log('[RECORDINGS] Duration parsed:', durationSeconds, 'seconds');
		
		if (durationSeconds > 180) {
			console.error('[RECORDINGS] Durée trop longue:', durationSeconds);
			return json({ error: 'Durée maximale: 3 minutes' }, { status: 400 });
		}

		const maxAudioSize = 20 * 1024 * 1024;
		if (audio.size > maxAudioSize) {
			console.error('[RECORDINGS] Fichier audio trop volumineux:', audio.size);
			return json({ error: 'Fichier audio trop volumineux (max 20 Mo)' }, { status: 400 });
		}

		console.log('[RECORDINGS] Reading audio buffer...');
		let audioBuffer;
		try {
			audioBuffer = Buffer.from(await audio.arrayBuffer());
			console.log('[RECORDINGS] Audio buffer created, size:', audioBuffer.length);
		} catch (err) {
			console.error('[RECORDINGS] ERROR reading audio arrayBuffer:', err);
			return json({ error: 'Erreur lors de la lecture du fichier audio' }, { status: 500 });
		}
		
		const audioFirstBytes = audioBuffer.slice(0, 24).toString('hex');
		console.log('[RECORDINGS] Audio first 24 bytes hex:', audioFirstBytes);
		
		const isValid = isValidAudioBuffer(audioBuffer);
		console.log('[RECORDINGS] isValidAudioBuffer:', isValid);

		if (!isValid) {
			console.error('[RECORDINGS] Format audio invalide, magic bytes:', audioFirstBytes);
			return json({ error: 'Format audio non valide. Utilisez WebM, MP4/M4A, OGG ou MP3.' }, { status: 400 });
		}

		console.log('[RECORDINGS] Computing SHA-256 hash...');
		const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
		console.log('[RECORDINGS] Hash:', audioHash.slice(0, 16) + '...');

		console.log('[RECORDINGS] Checking for duplicates (threshold:', DUPLICATE_THRESHOLD_SECONDS, 'seconds)');
		const recentRecording = getRecentRecordingByHash(locals.user.id, audioHash, DUPLICATE_THRESHOLD_SECONDS);
		console.log('[RECORDINGS] Duplicate check result:', recentRecording ? `found id=${recentRecording.id}` : 'none');
		
		if (recentRecording) {
			console.log('[RECORDINGS] Duplicate detected, returning...');
			return json({
				id: recentRecording.id,
				duplicate: true,
				message: 'Enregistrement déjà existant'
			});
		}

		const buffer = audioBuffer;

		let imageBuffer: Buffer | undefined;
		if (image && image.size > 0) {
			console.log('[RECORDINGS] Processing image:', image.type, image.size, 'bytes');
			
			const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
			const isHeic = image.type === 'image/heic' || image.type === 'image/heif';

			if (!validImageTypes.includes(image.type)) {
				console.error('[RECORDINGS] Type d\'image non autorisé:', image.type);
				return json({ error: 'Type d\'image non autorisé. Utilisez JPEG, PNG, WebP ou HEIC/HEIF.' }, { status: 400 });
			}

			try {
				imageBuffer = Buffer.from(await image.arrayBuffer());
				console.log('[RECORDINGS] Image buffer read, size:', imageBuffer.length);
			} catch (err) {
				console.error('[RECORDINGS] ERROR reading image arrayBuffer:', err);
				return json({ error: 'Erreur lors de la lecture de l\'image' }, { status: 500 });
			}

			const imageFirstBytes = imageBuffer.slice(0, 12).toString('hex');
			console.log('[RECORDINGS] Image first 12 bytes hex:', imageFirstBytes);

			if (isHeic) {
				console.log('[RECORDINGS] Converting HEIC/HEIF to JPEG with sharp...');
				try {
					const beforeSize = imageBuffer.length;
					imageBuffer = await sharp(imageBuffer)
						.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
						.jpeg({ quality: 85 })
						.toBuffer();
					console.log('[RECORDINGS] HEIC converted to JPEG:', beforeSize, '->', imageBuffer.length, 'bytes');
				} catch (err) {
					console.error('[RECORDINGS] ERROR converting HEIC with sharp:', err);
					return json({ error: 'Impossible de convertir l\'image HEIC. ' + (err as Error).message }, { status: 400 });
				}
			} else {
				if (!isValidImageBuffer(imageBuffer)) {
					console.error('[RECORDINGS] Image invalide (magic numbers), type:', image.type, 'bytes:', imageFirstBytes);
					return json({ error: 'Le fichier ne semble pas être une image valide.' }, { status: 400 });
				}
				console.log('[RECORDINGS] Image magic numbers validated');
			}

			const maxImageSize = 10 * 1024 * 1024;
			if (imageBuffer.length > maxImageSize) {
				console.error('[RECORDINGS] Image trop volumineuse:', imageBuffer.length);
				return json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 });
			}
		} else {
			console.log('[RECORDINGS] No image attached');
		}

		console.log('[RECORDINGS] Saving to database...');
		console.log('[RECORDINGS]   audio size:', buffer.length);
		console.log('[RECORDINGS]   image size:', imageBuffer?.length || 'none');
		console.log('[RECORDINGS]   duration:', durationSeconds);
		console.log('[RECORDINGS]   url:', url || 'none');
		console.log('[RECORDINGS]   hash:', audioHash.slice(0, 16) + '...');
		
		let recording;
		try {
			recording = saveRecording(locals.user.id, buffer, durationSeconds, imageBuffer, url || null, audioHash);
			console.log('[RECORDINGS] Recording saved successfully, id:', recording.id);
		} catch (err) {
			console.error('[RECORDINGS] ERROR saving recording to DB:', err);
			return json({ error: 'Erreur lors de l\'enregistrement en base de données: ' + (err as Error).message }, { status: 500 });
		}

		console.log('[RECORDINGS] SUCCESS - id:', recording.id, 'user:', locals.user.id);
		console.log('[RECORDINGS] ============================================');
		
		return json({ id: recording.id });

	} catch (err: any) {
		console.error('[RECORDINGS] UNHANDLED ERROR:', err);
		console.error('[RECORDINGS] Error message:', err?.message);
		console.error('[RECORDINGS] Error stack:', err?.stack);
		console.error('[RECORDINGS] ============================================');
		
		if (err.status === 303) {
			throw err;
		}
		
		return json({ 
			error: 'Une erreur est survenue: ' + (err?.message || 'Erreur inconnue'),
			details: err?.stack
		}, { status: 500 });
	}
};
