import type { LayoutServerLoad } from './$types';
import { getAppSettings, getBroadcastInfo, hasBroadcastInfoBeenRead } from '$lib/server/db';

export const load: LayoutServerLoad = async ({ locals }) => {
	const broadcastInfo = getBroadcastInfo();
	return {
		user: locals.user,
		appSettings: getAppSettings(),
		broadcastInfo: broadcastInfo.message ? {
			message: broadcastInfo.message,
			revision: broadcastInfo.revision,
			read: locals.user ? hasBroadcastInfoBeenRead(locals.user.id, broadcastInfo.revision) : false
		} : null
	};
};
