import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserRecentRecordings } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const userId = Number.parseInt(params.id, 10);
	if (!Number.isInteger(userId)) {
		return json({ error: 'Utilisateur invalide' }, { status: 400 });
	}

	if (locals.user.id !== userId && !locals.user.is_admin) {
		return json({ error: 'Non autorisé' }, { status: 403 });
	}

	const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10);
	const recordings = getUserRecentRecordings(userId, Math.min(Math.max(limit, 1), 20), locals.user.id === userId);

	return json({ recordings });
};
