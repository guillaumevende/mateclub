import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { getAllUsers, createUser, deleteUser, updateUserHour, toggleSuperPowers, getUserById, isPseudoAvailable, toggleLogsEnabled, toggleJinglesEnabled } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!locals.user.is_admin) {
		throw redirect(303, '/');
	}

	const users = getAllUsers();
	const currentUser = getUserById(locals.user.id);
	return { users, currentUser, csrfToken: locals.csrfToken };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const pseudo = data.get('pseudo')?.toString();
		const password = data.get('password')?.toString();
		const isAdmin = data.get('is_admin') === 'on';
		const avatar = data.get('avatar')?.toString() || '☕';

		if (!pseudo || !password) {
			return fail(400, { error: 'Pseudo et mot de passe requis' });
		}

		// Validation du mot de passe : 12+ caractères minimum
		if (password.length < 12) {
			return fail(400, { error: 'Le mot de passe doit contenir au moins 12 caractères' });
		}

		if (!isPseudoAvailable(pseudo)) {
			return fail(400, { error: 'Un autre utilisateur a déjà ce nom. Veuillez mettre un autre nom.' });
		}

		try {
			createUser(pseudo, password, isAdmin, avatar);
			return { success: true, message: `Utilisateur "${pseudo}" créé avec succès` };
		} catch (e) {
			return fail(400, { error: 'Pseudo déjà utilisé' });
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const userId = data.get('user_id')?.toString();

		if (userId) {
			deleteUser(parseInt(userId, 10));
		}
		return { success: true };
	},

	updateHour: async ({ request }) => {
		const data = await request.formData();
		const userId = data.get('user_id')?.toString();
		const hour = data.get('hour')?.toString();

		if (userId && hour) {
			updateUserHour(parseInt(userId, 10), parseInt(hour, 10));
		}
		return { success: true };
	},

	toggleSuperPowers: async ({ request, locals }) => {
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';

		if (locals.user && locals.user.id) {
			toggleSuperPowers(locals.user.id, enabled);
		}
		return { success: true };
	},

	toggleLogs: async ({ request, locals }) => {
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';

		if (locals.user && locals.user.id) {
			toggleLogsEnabled(locals.user.id, enabled);
		}
		return { success: true };
	},

	toggleJingles: async ({ request, locals }) => {
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';

		if (locals.user && locals.user.id) {
			toggleJinglesEnabled(locals.user.id, enabled);
		}
		return { success: true };
	}
};
