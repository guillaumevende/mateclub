// @ts-nocheck
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getRecordingsGroupedByDay, getUserById, getAllUsers, getUserTimezone, getUnreadCount } from '$lib/server/db';

export const load = async ({ locals, url }: Parameters<PageServerLoad>[0]) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = 7;

	const timezone = getUserTimezone(locals.user.id);
	const days = getRecordingsGroupedByDay(locals.user.id, limit, page, timezone);
	const user = getUserById(locals.user.id);
	const allUsers = getAllUsers();
	const unreadStats = getUnreadCount(locals.user.id);

	const thresholdMinutes = user?.daily_notification_hour ?? 420;
	const hours = Math.floor(thresholdMinutes / 60);
	const mins = thresholdMinutes % 60;
	const threshold = mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, '0')}`;

	return {
		days,
		threshold,
		user,
		allUsers,
		page,
		unreadStats
	};
};
