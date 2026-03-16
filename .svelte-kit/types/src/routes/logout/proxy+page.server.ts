// @ts-nocheck
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const load = async ({ cookies }: Parameters<PageServerLoad>[0]) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		deleteSession(sessionId);
		cookies.delete('session', { path: '/' });
	}
	throw redirect(303, '/login');
};
