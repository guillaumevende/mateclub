import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getShortRecordingAuthors, getShortRecordings, getUserById } from '$lib/server/db';

const PAGE_SIZE = 20;
const MAX_DURATION_SECONDS = 10;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!locals.user.is_admin) {
		throw redirect(303, '/');
	}

	const authorParam = url.searchParams.get('author');
	const fromDate = url.searchParams.get('from') || '';
	const toDate = url.searchParams.get('to') || '';
	const limitParam = parseInt(url.searchParams.get('limit') || String(PAGE_SIZE), 10);

	const authorId = authorParam ? parseInt(authorParam, 10) : null;
	const limit = Number.isFinite(limitParam) && limitParam > 0
		? Math.min(Math.max(limitParam, PAGE_SIZE), PAGE_SIZE * 10)
		: PAGE_SIZE;

	const recordings = getShortRecordings({
		authorId: Number.isFinite(authorId ?? NaN) ? authorId : null,
		fromDate: fromDate || null,
		toDate: toDate || null,
		maxDurationSeconds: MAX_DURATION_SECONDS,
		limit: limit + 1,
		offset: 0
	});

	return {
		currentUser: getUserById(locals.user.id),
		authors: getShortRecordingAuthors(MAX_DURATION_SECONDS),
		recordings: recordings.slice(0, limit),
		hasMore: recordings.length > limit,
		pageSize: PAGE_SIZE,
		currentLimit: limit,
		nextLimit: limit + PAGE_SIZE,
		filters: {
			authorId: Number.isFinite(authorId ?? NaN) ? authorId : null,
			fromDate,
			toDate
		}
	};
};
