import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session');
	if (sessionId) {
		deleteSession(sessionId);
	}
	cookies.delete('session', { path: '/' });
	return json({ success: true });
};
