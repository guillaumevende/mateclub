import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { hasAdmin, createUser, isPseudoAvailable } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	// If admin already exists, redirect to home
	if (hasAdmin()) {
		throw redirect(303, '/');
	}
	// Otherwise, allow access to setup page
	return { csrfToken: locals.csrfToken };
};

export const actions: Actions = {
	default: async ({ request }) => {
		// Double check - if admin was created while user was on page, reject
		if (hasAdmin()) {
			return fail(400, { error: 'Un administrateur existe déjà' });
		}

		const data = await request.formData();
		const pseudo = data.get('pseudo')?.toString()?.trim();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirm_password')?.toString();

		if (!pseudo || !password) {
			return fail(400, { error: 'Pseudo et mot de passe requis' });
		}

		if (password !== confirmPassword) {
			return fail(400, { error: 'Les mots de passe ne correspondent pas' });
		}

		if (password.length < 12) {
			return fail(400, { error: 'Le mot de passe doit contenir au moins 12 caractères' });
		}

		if (!isPseudoAvailable(pseudo)) {
			return fail(400, { error: 'Ce pseudo est déjà utilisé' });
		}

		try {
			// Create the first admin user
			createUser(pseudo, password, true);
			return { success: true };
		} catch (e) {
			return fail(400, { error: 'Erreur lors de la création du compte' });
		}
	}
};
