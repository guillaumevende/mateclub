import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getUserProfileImages, getUserProfileImagesCount, getUserById, getVisibleProfileImagesCountForViewer, getVisibleProfileImagesForViewer } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = parseInt(params.id, 10);
	if (Number.isNaN(userId) || !getUserById(userId)) {
		return json({ error: 'Utilisateur introuvable' }, { status: 404 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '8', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	const isOwnProfile = locals.user.id === userId;
	const images = isOwnProfile
		? getUserProfileImages(userId, limit, offset)
		: getVisibleProfileImagesForViewer(userId, locals.user.id, limit, offset);
	const total = isOwnProfile
		? getUserProfileImagesCount(userId)
		: getVisibleProfileImagesCountForViewer(userId, locals.user.id);

	return json({
		images,
		total,
		hasMore: offset + images.length < total
	});
};
