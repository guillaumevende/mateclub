import type { LayoutServerLoad } from './$types';
import { getAppSettings } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		appSettings: getAppSettings()
	};
};
