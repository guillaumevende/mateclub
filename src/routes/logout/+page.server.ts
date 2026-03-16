import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		deleteSession(sessionId);
		cookies.delete('session', { path: '/' });
	}
	throw redirect(303, '/login');
};
