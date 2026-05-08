import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getAppSettings } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		appSettings: getAppSettings()
	};
};
