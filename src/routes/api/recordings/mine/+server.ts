import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getUserRecordings, getUserRecordingsCount } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '5', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);

	try {
		const recordings = getUserRecordings(locals.user.id, limit, offset);
		const total = getUserRecordingsCount(locals.user.id);

		return json({
			recordings,
			total,
			hasMore: offset + recordings.length < total
		});
	} catch (error) {
		console.error('Error fetching user recordings:', error);
		return json({ error: 'Internal error' }, { status: 500 });
	}
};
