import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { hashSync } from 'bcrypt';
import { getAudioProcessingRuntimeConfig } from '$lib/server/audioProcessing';
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
	getBroadcastInfo,
	approveRegistration,
	rejectRegistration,
	isRegistrationAllowed,
	saveBroadcastInfoMessage,
	setAppConfig,
	setUserAdmin,
	updateUserPassword,
	markLatestOtherRecordingsAsUnread,
	getOldestAdminId,
	getAppSettings
} from '$lib/server/db';
import { getPushRuntimeConfig } from '$lib/server/push';

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
	const oldestAdminId = getOldestAdminId();
	const appSettings = getAppSettings();
	const broadcastInfo = getBroadcastInfo();
	const pushConfig = getPushRuntimeConfig();
	const audioProcessingConfig = getAudioProcessingRuntimeConfig();
	return {
		users,
		currentUser,
		csrfToken: locals.csrfToken,
		pendingRegistrations,
		allowRegistration,
		oldestAdminId,
		appSettings,
		broadcastInfo,
		pushConfig,
		audioProcessingConfig
	};
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

	saveGroupConfig: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const data = await request.formData();
		const groupName = data.get('group_name')?.toString().trim() ?? '';
		const historyMonthsRaw = data.get('history_months')?.toString() ?? '';
		const maxMinutesRaw = data.get('max_recording_minutes')?.toString() ?? '';
		const maxSecondsRaw = data.get('max_recording_seconds')?.toString() ?? '';
		const currentSettings = getAppSettings();

		if (groupName.length > currentSettings.maxGroupNameLength) {
			return fail(400, { error: `Le nom du groupe ne doit pas dépasser ${currentSettings.maxGroupNameLength} caractères` });
		}

		if (!/^\d+$/.test(historyMonthsRaw)) {
			return fail(400, { error: 'La durée d’historique doit être un nombre entier de mois' });
		}

		const historyMonths = Number.parseInt(historyMonthsRaw, 10);
		if (historyMonths < 1 || historyMonths > 24) {
			return fail(400, { error: 'La durée d’historique doit être comprise entre 1 et 24 mois' });
		}

		if (!/^\d+$/.test(maxMinutesRaw) || !/^\d+$/.test(maxSecondsRaw)) {
			return fail(400, { error: 'La durée maximum des messages audio doit être composée de nombres entiers' });
		}

		const maxMinutes = Number.parseInt(maxMinutesRaw, 10);
		const maxSeconds = Number.parseInt(maxSecondsRaw, 10);
		if (maxSeconds < 0 || maxSeconds > 59 || maxMinutes < 0) {
			return fail(400, { error: 'Les secondes doivent être comprises entre 0 et 59' });
		}

		const maxRecordingSeconds = maxMinutes * 60 + maxSeconds;
		if (maxRecordingSeconds < 15) {
			return fail(400, { error: 'La durée maximum doit être d’au moins 15 secondes' });
		}

		if (maxRecordingSeconds > 3600) {
			return fail(400, { error: 'La durée maximum ne peut pas dépasser 60 minutes' });
		}

		setAppConfig('group_name', groupName);
		setAppConfig('history_months', historyMonths.toString());
		setAppConfig('max_recording_seconds', maxRecordingSeconds.toString());

		return {
			success: true,
			message: 'Réglages du groupe enregistrés',
			appSettings: getAppSettings()
		};
	},

	saveBroadcastInfo: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const data = await request.formData();
		const message = data.get('broadcast_info_message')?.toString() ?? '';
		const result = saveBroadcastInfoMessage(message);

		return {
			success: true,
			message: result.message
				? 'Information utilisateurs diffusée'
				: 'Information utilisateurs supprimée',
			broadcastInfo: result
		};
	},

	toggleAudioProcessing: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const runtimeConfig = getAudioProcessingRuntimeConfig();
		if (!runtimeConfig.configured) {
			return fail(400, { error: 'Le traitement audio n’est pas configuré sur ce serveur' });
		}

		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';
		setAppConfig('audio_processing_enabled', enabled ? 'true' : 'false');

		return {
			success: true,
			message: enabled
				? 'Amélioration audio activée pour les prochaines capsules'
				: 'Amélioration audio désactivée'
		};
	},

	markLatestUnread: async ({ locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const result = markLatestOtherRecordingsAsUnread(locals.user.id, 5);

		if (result.selectedCount === 0) {
			return { success: true, message: 'Aucune capsule audio d’un autre utilisateur à passer en non lu' };
		}

		const plural = result.selectedCount > 1 ? 's' : '';
		return {
			success: true,
			message: `${result.selectedCount} capsule${plural} audio passée${plural} en non lu`
		};
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

	removeAdmin: async ({ request, locals }) => {
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
			return fail(400, { error: 'Cet utilisateur n’est pas administrateur' });
		}

		const oldestAdminId = getOldestAdminId();
		if (oldestAdminId !== null && targetUser.id === oldestAdminId) {
			return fail(400, { error: 'Impossible de retirer le statut admin à l’administrateur le plus ancien' });
		}

		setUserAdmin(targetUser.id, false);
		return { success: true };
	},

	resetPassword: async ({ request, locals }) => {
		if (!locals.user?.is_admin) {
			return fail(403, { error: 'Non autorisé' });
		}

		const data = await request.formData();
		const userId = data.get('user_id')?.toString();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirm_password')?.toString();

		if (!userId || !password || !confirmPassword) {
			return fail(400, { error: 'Utilisateur et mot de passe requis' });
		}

		if (password.length < 12) {
			return fail(400, { error: 'Le mot de passe doit contenir au moins 12 caractères' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Les mots de passe ne correspondent pas' });
		}

		const targetUser = getUserById(parseInt(userId, 10));
		if (!targetUser) {
			return fail(404, { error: 'Utilisateur introuvable' });
		}

		if (targetUser.is_admin && targetUser.id !== locals.user.id) {
			return fail(400, { error: 'Impossible de modifier le mot de passe d’un autre administrateur' });
		}

		const hashedPassword = hashSync(password, 10);
		updateUserPassword(targetUser.id, hashedPassword);

		return { success: true, message: `Mot de passe de "${targetUser.pseudo}" mis à jour` };
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
