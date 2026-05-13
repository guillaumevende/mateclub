import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { saveRecording, getRecentRecordingByHash, getConfiguredMaxRecordingSeconds, isAudioProcessingEnabled } from '$lib/server/db';
import { getAudioProcessingRuntimeConfig, pokeAudioProcessingWorker } from '$lib/server/audioProcessing';
import { detectAudioMimeType, isValidAudioBuffer, isValidImageBuffer } from '$lib/server/fileValidation';
import { prepareAudioForStorage } from '$lib/server/audioCompatibility';
import crypto from 'crypto';
import sharp from 'sharp';

const DUPLICATE_THRESHOLD_SECONDS = 30;

function buildRecordingFilenameBase(recordedAt: Date, pseudo: string, timezone: string): string {
	const timestampParts = new Intl.DateTimeFormat('sv-SE', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(recordedAt);

	const getPart = (type: Intl.DateTimeFormatPartTypes) =>
		timestampParts.find((part) => part.type === type)?.value ?? '';

	const compactTimestamp = `${getPart('year')}${getPart('month')}${getPart('day')}${getPart('hour')}${getPart('minute')}`;
	const pseudoPrefix = pseudo
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
		.slice(0, 3) || 'usr';

	return `${compactTimestamp}_${pseudoPrefix}`;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	let formData;
	try {
		formData = await request.formData();
	} catch (err) {
		console.error('[RECORDINGS] Error parsing formData:', err);
		return json({ error: 'Erreur interne' }, { status: 400 });
	}

	const audio = formData.get('audio') as File;
	const duration = formData.get('duration')?.toString();
	const image = formData.get('image') as File | null;
	const url = formData.get('url')?.toString();
	const recordedAtRaw = formData.get('recorded_at')?.toString();

	if (!audio || audio.size === 0) {
		console.error('[RECORDINGS] Audio vide ou absent, user:', locals.user.id);
		return json({ error: 'Audio requis' }, { status: 400 });
	}

	if (url && url.trim() !== '') {
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:') {
				console.error('[RECORDINGS] URL non https:', parsed.protocol, 'user:', locals.user.id);
				return json({ error: 'L\'URL doit commencer par https://' }, { status: 400 });
			}
		} catch {
			console.error('[RECORDINGS] URL invalide:', url, 'user:', locals.user.id);
			return json({ error: 'URL invalide' }, { status: 400 });
		}
	}

	const durationSeconds = parseInt(duration || '0', 10);
	const maxRecordingSeconds = getConfiguredMaxRecordingSeconds();
	if (durationSeconds > maxRecordingSeconds) {
		const maxMinutes = Math.floor(maxRecordingSeconds / 60);
		const maxSeconds = maxRecordingSeconds % 60;
		const maxDurationLabel = maxSeconds === 0
			? `${maxMinutes} minute${maxMinutes > 1 ? 's' : ''}`
			: `${maxMinutes} minute${maxMinutes > 1 ? 's' : ''} et ${maxSeconds} seconde${maxSeconds > 1 ? 's' : ''}`;
		console.error('[RECORDINGS] Durée trop longue:', durationSeconds, 'user:', locals.user.id);
		return json({ error: `Durée maximale: ${maxDurationLabel}` }, { status: 400 });
	}

	const maxAudioSize = 20 * 1024 * 1024;
	if (audio.size > maxAudioSize) {
		console.error('[RECORDINGS] Fichier audio trop volumineux:', audio.size, 'user:', locals.user.id);
		return json({ error: 'Fichier audio trop volumineux (max 20 Mo)' }, { status: 400 });
	}

	let audioBuffer;
	try {
		audioBuffer = Buffer.from(await audio.arrayBuffer());
	} catch (err) {
		console.error('[RECORDINGS] Error reading audio:', err);
		return json({ error: 'Erreur lors de la lecture du fichier audio' }, { status: 500 });
	}

	if (!isValidAudioBuffer(audioBuffer)) {
		console.error('[RECORDINGS] Format audio invalide, user:', locals.user.id);
		return json({ error: 'Format audio non valide. Utilisez WebM, MP4/M4A, OGG ou MP3.' }, { status: 400 });
	}

	const detectedAudioMimeType = detectAudioMimeType(audioBuffer);

	let preparedAudio;
	try {
		preparedAudio = await prepareAudioForStorage(audioBuffer, detectedAudioMimeType);
	} catch (err) {
		console.error('[RECORDINGS] Error preparing audio for storage:', err);
		return json({ error: 'Impossible de convertir cet audio pour les navigateurs Apple' }, { status: 400 });
	}

	const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
	const recentRecording = getRecentRecordingByHash(locals.user.id, audioHash, DUPLICATE_THRESHOLD_SECONDS);
	
	if (recentRecording) {
		return json({
			id: recentRecording.id,
			duplicate: true,
			message: 'Enregistrement déjà existant'
		});
	}

	const buffer = preparedAudio.buffer;
	const recordedAt = recordedAtRaw ? new Date(recordedAtRaw) : null;
	const normalizedRecordedAt = recordedAt
		? recordedAt.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
		: null;
	if (recordedAtRaw && (!recordedAt || Number.isNaN(recordedAt.getTime()))) {
		return json({ error: 'Horodatage d’enregistrement invalide' }, { status: 400 });
	}
	const filenameBase = buildRecordingFilenameBase(
		recordedAt ?? new Date(),
		locals.user.pseudo,
		locals.user.timezone || 'Europe/Paris'
	);

	let imageBuffer: Buffer | undefined;
	if (image && image.size > 0) {
		const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
		const isHeic = image.type === 'image/heic' || image.type === 'image/heif';

		if (!validImageTypes.includes(image.type)) {
			console.error('[RECORDINGS] Type d\'image non autorisé:', image.type, 'user:', locals.user.id);
			return json({ error: 'Type d\'image non autorisé. Utilisez JPEG, PNG, WebP ou HEIC/HEIF.' }, { status: 400 });
		}

		try {
			imageBuffer = Buffer.from(await image.arrayBuffer());
		} catch (err) {
			console.error('[RECORDINGS] Error reading image:', err);
			return json({ error: 'Erreur lors de la lecture de l\'image' }, { status: 500 });
		}

		if (isHeic) {
			try {
				imageBuffer = await sharp(imageBuffer)
					.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
					.jpeg({ quality: 85 })
					.toBuffer();
			} catch (err) {
				console.error('[RECORDINGS] Error converting HEIC:', err);
				return json({ error: 'Erreur lors du traitement de l\'image' }, { status: 400 });
			}
		} else {
			if (!isValidImageBuffer(imageBuffer)) {
				console.error('[RECORDINGS] Image invalide (magic numbers), user:', locals.user.id);
				return json({ error: 'Le fichier ne semble pas être une image valide.' }, { status: 400 });
			}
		}

		const maxImageSize = 10 * 1024 * 1024;
		if (imageBuffer.length > maxImageSize) {
			console.error('[RECORDINGS] Image trop volumineuse:', imageBuffer.length, 'user:', locals.user.id);
			return json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 });
		}
	}

	let recording;
	try {
		const audioProcessingRuntime = getAudioProcessingRuntimeConfig();
		const useAudioProcessing = audioProcessingRuntime.configured && isAudioProcessingEnabled();
		recording = saveRecording(
			locals.user.id,
			buffer,
			durationSeconds,
			{
				audioExtension: preparedAudio.extension,
				imageData: imageBuffer,
				url: url || null,
				audioHash,
				filenameBase,
				processedFilename: useAudioProcessing ? null : undefined,
				processingStatus: useAudioProcessing ? 'processing' : 'ready',
				processingMode: useAudioProcessing ? 'deepfilter' : 'none',
				processedAt: useAudioProcessing ? null : undefined,
				recordedAt: normalizedRecordedAt
			}
		);
		if (useAudioProcessing) {
			pokeAudioProcessingWorker();
		}
	} catch (err) {
		console.error('[RECORDINGS] Error saving recording:', err);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}

	return json({
		id: recording.id,
		processingStatus: recording.processing_status,
		processingMode: recording.processing_mode
	});
};
