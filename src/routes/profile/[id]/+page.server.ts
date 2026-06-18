import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getUserById, getUserProfileImages, getUserProfileImagesCount, getUserRecentRecordings, getVisibleProfileImagesCountForViewer, getVisibleProfileImagesForViewer, getVisibleRecentRecordingsForViewer, getUserCurrentAge } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const userId = parseInt(params.id, 10);
	if (Number.isNaN(userId)) {
		throw error(404, 'Profil introuvable');
	}

	const profileUser = getUserById(userId);
	if (!profileUser) {
		throw error(404, 'Profil introuvable');
	}

	const isOwnProfile = locals.user.id === userId;
	const images = isOwnProfile
		? getUserProfileImages(userId, 8, 0)
		: getVisibleProfileImagesForViewer(userId, locals.user.id, 8, 0);
	const totalImages = isOwnProfile
		? getUserProfileImagesCount(userId)
		: getVisibleProfileImagesCountForViewer(userId, locals.user.id);
	const recordings = isOwnProfile
		? getUserRecentRecordings(userId, 10)
		: getVisibleRecentRecordingsForViewer(userId, locals.user.id, 10);
	const profileAge = getUserCurrentAge(profileUser, locals.user.timezone || 'Europe/Paris');

	return {
		profileUser,
		profileAge,
		currentUserId: locals.user.id,
		images,
		totalImages,
		hasMoreImages: images.length < totalImages,
		recordings
	};
};
