import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ user: null }, { status: 401 });
	}
	return json({
		user: {
			id: locals.user.id,
			pseudo: locals.user.pseudo,
			avatar: locals.user.avatar,
			is_admin: locals.user.is_admin,
			daily_notification_hour: locals.user.daily_notification_hour
		}
	});
};
