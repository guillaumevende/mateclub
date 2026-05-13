import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBroadcastInfo, markBroadcastInfoAsRead } from '$lib/server/db';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const payload = await request.json().catch(() => null) as { revision?: number } | null;
	const revision = Number.parseInt(String(payload?.revision ?? ''), 10);
	const currentInfo = getBroadcastInfo();

	if (!Number.isInteger(revision) || revision <= 0 || revision !== currentInfo.revision || !currentInfo.message) {
		return json({ error: 'Information invalide' }, { status: 400 });
	}

	markBroadcastInfoAsRead(locals.user.id, revision);
	return json({ success: true });
};
