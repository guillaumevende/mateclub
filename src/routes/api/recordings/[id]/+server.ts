import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { getRecordingById, getRecordingFilePath, markAsListened, deleteRecording, updateRecordingImage } from '$lib/server/db';
import { existsSync, createReadStream, statSync, openSync, readSync, closeSync } from 'fs';
import { detectAudioMimeType, isValidImageBuffer } from '$lib/server/fileValidation';
import { Readable } from 'stream';
import sharp from 'sharp';

function parseRangeHeader(rangeHeader: string | null, fileSize: number) {
	if (!rangeHeader) return null;

	const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
	if (!match) return null;

	const [, rawStart, rawEnd] = match;
	let start = rawStart ? parseInt(rawStart, 10) : 0;
	let end = rawEnd ? parseInt(rawEnd, 10) : fileSize - 1;

	if (!rawStart && rawEnd) {
		const suffixLength = parseInt(rawEnd, 10);
		start = Math.max(fileSize - suffixLength, 0);
		end = fileSize - 1;
	}

	if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
		return { unsatisfiable: true as const };
	}

	return {
		start,
		end: Math.min(end, fileSize - 1),
		unsatisfiable: false as const
	};
}

export const GET: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const recordingId = parseInt(params.id);
	const recording = getRecordingById(recordingId);
	if (!recording) {
		return json({ error: 'Fichier non trouvé' }, { status: 404 });
	}

	markAsListened(recordingId, locals.user.id);

	const filepath = getRecordingFilePath(recording.filename);
	
	if (!existsSync(filepath)) {
		return json({ error: 'Fichier non trouvé' }, { status: 404 });
	}

	const stat = statSync(filepath);
	const headerBuffer = Buffer.alloc(12);
	const fd = openSync(filepath, 'r');
	try {
		readSync(fd, headerBuffer, 0, 12, 0);
	} finally {
		closeSync(fd);
	}

	const detectedMimeType = detectAudioMimeType(headerBuffer);
	const fallbackMimeType = recording.filename.endsWith('.webm')
		? 'audio/webm'
		: recording.filename.endsWith('.ogg')
			? 'audio/ogg'
			: recording.filename.endsWith('.mp3')
				? 'audio/mpeg'
				: 'audio/mp4';
	const contentType = detectedMimeType || fallbackMimeType;
	const range = parseRangeHeader(request.headers.get('range'), stat.size);

	if (range?.unsatisfiable) {
		return new Response(null, {
			status: 416,
			headers: {
				'Content-Range': `bytes */${stat.size}`,
				'Accept-Ranges': 'bytes',
				'Cache-Control': 'no-cache'
			}
		});
	}

	if (range) {
		const chunkSize = range.end - range.start + 1;

		return new Response(
			Readable.toWeb(createReadStream(filepath, { start: range.start, end: range.end })) as unknown as ReadableStream<Uint8Array>,
			{
				status: 206,
				headers: {
					'Content-Type': contentType,
					'Content-Length': chunkSize.toString(),
					'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`,
					'Accept-Ranges': 'bytes',
					'Cache-Control': 'no-cache'
				}
			}
		);
	}

	return new Response(Readable.toWeb(createReadStream(filepath)) as unknown as ReadableStream<Uint8Array>, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': stat.size.toString(),
			'Accept-Ranges': 'bytes',
			'Cache-Control': 'no-cache'
		}
	});
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const recordingId = parseInt(params.id);
	const recording = getRecordingById(recordingId);
	
	if (!recording) {
		return json({ error: 'Enregistrement non trouvé' }, { status: 404 });
	}

	// Users can delete their own recordings; admins can clean up any recording
	if (recording.user_id !== locals.user.id && !locals.user.is_admin) {
		return json({ error: 'Non autorisé' }, { status: 403 });
	}

	try {
		deleteRecording(recordingId);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting recording:', error);
		return json({ error: 'Erreur lors de la suppression' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const recordingId = parseInt(params.id, 10);
	const recording = getRecordingById(recordingId);

	if (!recording) {
		return json({ error: 'Enregistrement non trouvé' }, { status: 404 });
	}

	if (recording.user_id !== locals.user.id) {
		return json({ error: 'Non autorisé' }, { status: 403 });
	}

	if (recording.image_filename) {
		return json({ error: 'Cette capsule a déjà une image' }, { status: 400 });
	}

	const recordedAt = new Date(recording.recorded_at.includes('T') ? recording.recorded_at : `${recording.recorded_at.replace(' ', 'T')}Z`);
	if (Number.isNaN(recordedAt.getTime()) || Date.now() - recordedAt.getTime() > 24 * 60 * 60 * 1000) {
		return json({ error: 'Cette capsule n’est plus modifiable' }, { status: 400 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Requête invalide' }, { status: 400 });
	}

	const image = formData.get('image');
	if (!(image instanceof File) || image.size === 0) {
		return json({ error: 'Image requise' }, { status: 400 });
	}

	const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
	const isHeic = image.type === 'image/heic' || image.type === 'image/heif';
	if (!validImageTypes.includes(image.type)) {
		return json({ error: 'Type d’image non autorisé' }, { status: 400 });
	}

	let imageBuffer: Buffer;
	try {
		imageBuffer = Buffer.from(await image.arrayBuffer());
	} catch {
		return json({ error: 'Erreur lors de la lecture de l’image' }, { status: 500 });
	}

	if (isHeic) {
		try {
			imageBuffer = await sharp(imageBuffer)
				.resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
				.jpeg({ quality: 85 })
				.toBuffer();
		} catch {
			return json({ error: 'Erreur lors du traitement de l’image' }, { status: 400 });
		}
	} else if (!isValidImageBuffer(imageBuffer)) {
		return json({ error: 'Le fichier ne semble pas être une image valide.' }, { status: 400 });
	}

	const maxImageSize = 10 * 1024 * 1024;
	if (imageBuffer.length > maxImageSize) {
		return json({ error: 'Image trop volumineuse (max 10 Mo)' }, { status: 400 });
	}

	try {
		const updated = updateRecordingImage(recordingId, imageBuffer);
		return json({ recording: updated });
	} catch (error) {
		console.error('Error updating recording image:', error);
		return json({ error: 'Erreur lors de la mise à jour de l’image' }, { status: 500 });
	}
};
