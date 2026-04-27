import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { 
	getAllUsers, 
	createUser, 
	deleteUser, 
	updateUserHour, 
	toggleSuperPowers, 
	getUserById, 
	isPseudoAvailable, 
	toggleLogsEnabled, 
	toggleJinglesEnabled,
	getPendingRegistrations,
	approveRegistration,
	rejectRegistration,
	isRegistrationAllowed,
	setAppConfig,
	setUserAdmin
} from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	if (!locals.user.is_admin) {
		throw redirect(303, '/');
	}

	const users = getAllUsers();
	const currentUser = getUserById(locals.user.id);
	const pendingRegistrations = getPendingRegistrations();
	const allowRegistration = isRegistrationAllowed();
	return { users, currentUser, csrfToken: locals.csrfToken, pendingRegistrations, allowRegistration };
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

	delete: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}
		
		const data = await request.formData();
		const userId = data.get('user_id')?.toString();

		if (userId) {
			const targetUser = getUserById(parseInt(userId, 10));
			if (!targetUser) {
				return fail(404, { error: 'Utilisateur introuvable' });
			}

			if (targetUser.is_admin) {
				return fail(400, { error: 'Impossible de supprimer un administrateur' });
			}

			deleteUser(parseInt(userId, 10));
		}
		return { success: true };
	},

	updateHour: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}
		
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

	toggleUserLogs: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const data = await request.formData();
		const userId = data.get('user_id')?.toString();
		const enabled = data.get('enabled') === 'true';

		if (!userId) {
			return fail(400, { error: 'Utilisateur manquant' });
		}

		toggleLogsEnabled(parseInt(userId, 10), enabled);
		return { success: true };
	},

		toggleJingles: async ({ request, locals }) => {
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';

		if (locals.user && locals.user.id) {
			toggleJinglesEnabled(locals.user.id, enabled);
		}
		return { success: true };
	},

	approveRegistration: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}
		
		const data = await request.formData();
		const registrationId = data.get('registration_id')?.toString();
		const isAdmin = data.get('is_admin') === 'on';

		if (registrationId) {
			try {
				const user = approveRegistration(parseInt(registrationId, 10), isAdmin);
				return { success: true, message: `Utilisateur "${user.pseudo}" validé avec succès` };
			} catch (e) {
				return fail(400, { error: 'Erreur lors de la validation' });
			}
		}
		return { success: false };
	},

	promoteToAdmin: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const data = await request.formData();
		const userId = data.get('user_id')?.toString();

		if (!userId) {
			return fail(400, { error: 'Utilisateur manquant' });
		}

		const targetUser = getUserById(parseInt(userId, 10));
		if (!targetUser) {
			return fail(404, { error: 'Utilisateur introuvable' });
		}

		if (!targetUser.is_admin) {
			setUserAdmin(targetUser.id, true);
		}

		return { success: true };
	},

	rejectRegistration: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}
		
		const data = await request.formData();
		const registrationId = data.get('registration_id')?.toString();

		if (registrationId) {
			rejectRegistration(parseInt(registrationId, 10));
			return { success: true };
		}
		return { success: false };
	},

	toggleRegistration: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}
		
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';
		
		setAppConfig('allow_registration', enabled ? 'true' : 'false');
		return { success: true, allowRegistration: enabled };
	}
};
