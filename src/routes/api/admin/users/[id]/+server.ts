import type { RequestHandler } from './$types';
import { redirect, json } from '@sveltejs/kit';
import { deleteUser, getUserById, toggleSuperPowers, toggleLogsEnabled, toggleJinglesEnabled, updateUserHour } from '$lib/server/db';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !locals.user.is_admin) {
		return json({ error: 'Accès refusé' }, { status: 403 });
	}

	const userId = parseInt(params.id);
	const targetUser = getUserById(userId);

	if (!targetUser) {
		return json({ error: 'Utilisateur non trouvé' }, { status: 404 });
	}

	if (targetUser.is_admin) {
		return json({ error: 'Impossible de supprimer un administrateur' }, { status: 400 });
	}

	deleteUser(userId);
	return json({ success: true });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || !locals.user.is_admin) {
		return json({ error: 'Accès refusé' }, { status: 403 });
	}

	const userId = parseInt(params.id);
	const data = await request.json();
	const { action, value } = data;

	switch (action) {
		case 'super_powers':
			toggleSuperPowers(userId, value);
			break;
		case 'logs_enabled':
			toggleLogsEnabled(userId, value);
			break;
		case 'jingles_enabled':
			toggleJinglesEnabled(userId, value);
			break;
		case 'threshold':
			updateUserHour(userId, value);
			break;
		default:
			return json({ error: 'Action inconnue' }, { status: 400 });
	}

	return json({ success: true });
};
