import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { getRecordingById, getRecordingFilePath, markAsListened, deleteRecording } from '$lib/server/db';
import { existsSync, createReadStream, statSync } from 'fs';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params, locals }) => {
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
	const isM4A = recording.filename.endsWith('.m4a');
	const contentType = isM4A ? 'audio/mp4' : 'audio/webm';

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

	// Only allow users to delete their own recordings
	if (recording.user_id !== locals.user.id) {
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
