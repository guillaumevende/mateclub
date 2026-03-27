import type { PageServerLoad, Actions } from './$types';
import { redirect, fail, error } from '@sveltejs/kit';
import { 
	isRegistrationAllowed, 
	isPseudoAvailableForRegistration, 
	createPendingRegistration,
	canAttemptLogin, 
	recordLoginAttempt, 
	getRemainingLockoutTime 
} from '$lib/server/db';
import { version } from '../../../package.json';

function getTimezones() {
	const timezones = Intl.supportedValuesOf('timeZone');
	const now = new Date();
	
	return timezones.map(tz => {
		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			timeZoneName: 'shortOffset'
		});
		const parts = formatter.formatToParts(now);
		const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
		return { value: tz, label: `${tz} (${offset})` };
	}).sort((a, b) => a.label.localeCompare(b.label));
}

const timezones = getTimezones();

export const load: PageServerLoad = async ({ locals }) => {
	// Vérifie si les inscriptions sont ouvertes
	const closed = !isRegistrationAllowed();
	
	// Si déjà connecté, redirige vers l'accueil
	if (locals.user && !closed) {
		throw redirect(303, '/');
	}
	
	return {
		csrfToken: locals.csrfToken,
		version,
		closed,
		timezones
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const clientIp = getClientAddress();
		
		// Vérifie si les inscriptions sont ouvertes
		if (!isRegistrationAllowed()) {
			return fail(403, { closed: true, error: 'Les inscriptions sont actuellement fermées.' });
		}
		
		// Rate limiting check (même système que login)
		if (!canAttemptLogin(clientIp)) {
			const remainingMinutes = getRemainingLockoutTime(clientIp);
			return fail(429, { 
				error: `Trop de tentatives. Réessayez dans ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
				lockout: true 
			});
		}

		const data = await request.formData();
		const pseudo = data.get('pseudo')?.toString()?.trim();
		const password = data.get('password')?.toString();
		const passwordConfirm = data.get('password_confirm')?.toString();
		const avatar = data.get('avatar')?.toString() || '☕';
		const timezone = data.get('timezone')?.toString() || 'Europe/Paris';

		// Validation des champs requis
		if (!pseudo || !password || !passwordConfirm) {
			recordLoginAttempt(clientIp);
			return fail(400, { error: 'Tous les champs sont requis.' });
		}

		// Validation longueur pseudo
		if (pseudo.length < 3 || pseudo.length > 30) {
			recordLoginAttempt(clientIp);
			return fail(400, { error: 'Le pseudo doit contenir entre 3 et 30 caractères.' });
		}

		// Validation mot de passe : 12+ caractères
		if (password.length < 12) {
			recordLoginAttempt(clientIp);
			return fail(400, { 
				error: 'Le mot de passe doit contenir au moins 12 caractères.',
				passwordError: true 
			});
		}

		// Vérifie que les deux mots de passe sont identiques
		if (password !== passwordConfirm) {
			recordLoginAttempt(clientIp);
			return fail(400, { 
				error: 'Les deux mots de passe ne correspondent pas.',
				passwordMatchError: true 
			});
		}

		// Vérifie que le pseudo n'est pas déjà utilisé
		if (!isPseudoAvailableForRegistration(pseudo)) {
			recordLoginAttempt(clientIp);
			return fail(400, { 
				error: 'Ce pseudo est déjà utilisé. Veuillez en choisir un autre.',
				pseudoError: true 
			});
		}

		try {
			// Crée la demande d'inscription en attente
			createPendingRegistration(pseudo, password, avatar, timezone);
			
			return { 
				success: true, 
				message: 'Tu es bien inscrit : attends qu\'on valide ton accès' 
			};
		} catch (e) {
			recordLoginAttempt(clientIp);
			return fail(500, { error: 'Une erreur est survenue lors de l\'inscription.' });
		}
	}
};
