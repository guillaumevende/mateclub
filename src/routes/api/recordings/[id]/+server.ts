import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { getRecordingById, getRecordingFilePath, markAsListened, deleteRecording } from '$lib/server/db';
import { existsSync, createReadStream, statSync, openSync, readSync, closeSync } from 'fs';
import { detectAudioMimeType } from '$lib/server/fileValidation';
import { Readable } from 'stream';

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
