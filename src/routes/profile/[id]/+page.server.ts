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

	const images = getUserProfileImages(userId, 8, 0);
	const totalImages = getUserProfileImagesCount(userId);
	const recordings = getUserRecentRecordings(userId, 10);

	return {
		profileUser,
		currentUserId: locals.user.id,
		images,
		totalImages,
		hasMoreImages: images.length < totalImages,
		recordings
	};
};
