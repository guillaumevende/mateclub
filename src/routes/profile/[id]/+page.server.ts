import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { getUserById, getUserProfileImages, getUserProfileImagesCount, getUserRecentRecordings } from '$lib/server/db';

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
	const images = getUserProfileImages(userId, 8, 0, isOwnProfile);
	const totalImages = getUserProfileImagesCount(userId, isOwnProfile);
	const recordings = getUserRecentRecordings(userId, 10, isOwnProfile);

	return {
		profileUser,
		currentUserId: locals.user.id,
		images,
		totalImages,
		hasMoreImages: images.length < totalImages,
		recordings
	};
};
