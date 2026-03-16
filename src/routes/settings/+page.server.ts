import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { hashSync } from 'bcrypt';
import { updateUserAvatar, updateUserHour, updateUserTimezone, getUserById, updateUserPassword, updateUserPseudo, isPseudoAvailable } from '$lib/server/db';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Regex pour validation pseudo: lettres, chiffres, accents européens, espaces, - . _
const PSEUDO_REGEX = /^[a-zA-Z0-9\s\-._àáâãäåæçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ]{3,22}$/;

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

const uploadsDir = join(process.cwd(), 'uploads', 'avatars');

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}
	const user = getUserById(locals.user.id);
	
	// Chercher si un fichier avatar existe déjà pour cet utilisateur
	let savedImage: string | null = null;
	if (user?.avatar?.includes('/')) {
		// Nouveau format: userId/filename
		savedImage = user.avatar;
	} else if (user?.avatar?.startsWith('avatar_')) {
		// Ancien format: juste filename (migration)
		savedImage = user.avatar;
	}
	
	// Chercher dans le dossier spécifique de l'utilisateur
	const userDir = join(uploadsDir, locals.user.id.toString());
	if (!savedImage && existsSync(userDir)) {
		try {
			const files = readdirSync(userDir);
			const avatarFiles = files.filter(f => f.startsWith('avatar_'));
			if (avatarFiles.length > 0) {
				// Prendre le plus récent
				savedImage = `${locals.user.id}/${avatarFiles.sort().reverse()[0]}`;
			}
		} catch (e) {
			// Dossier vide
		}
	}
	
	return {
		user,
		hour: user?.daily_notification_hour || 420,
		timezones,
		savedImage,
		csrfToken: locals.csrfToken
	};
};

	export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const avatar = data.get('avatar')?.toString() || '☕';
		const avatarImage = data.get('avatarImage')?.toString();
		
		// Parser le format HH:mm et convertir en minutes depuis minuit
		const hourValue = data.get('hour')?.toString();
		
		// Validation : l'heure est obligatoire
		if (!hourValue || hourValue.trim() === '') {
			return fail(400, { 
				success: false, 
				hourError: 'Veuillez sélectionner une heure de disponibilité' 
			});
		}
		
		const [hourStr, minuteStr] = hourValue.split(':');
		const hour = parseInt(hourStr || '7', 10);
		const minute = parseInt(minuteStr || '0', 10);
		const minutesFromMidnight = hour * 60 + minute;
		
		const timezone = data.get('timezone')?.toString();
		const password = data.get('password')?.toString();
		const confirmPassword = data.get('confirmPassword')?.toString();
		const pseudo = data.get('pseudo')?.toString();
		
		if (locals.user) {
			// Validation et mise à jour du pseudo
			if (pseudo && pseudo.length > 0) {
				if (pseudo.length < 3) {
					return fail(400, { 
						success: false, 
						error: 'Le pseudo doit contenir au moins 3 caractères' 
					});
				}
				if (pseudo.length > 22) {
					return fail(400, { 
						success: false, 
						error: 'Le pseudo ne doit pas dépasser 22 caractères' 
					});
				}
				if (!PSEUDO_REGEX.test(pseudo)) {
					return fail(400, { 
						success: false, 
						error: 'Le pseudo contient des caractères non autorisés' 
					});
				}
				// Vérifier si le pseudo est déjà utilisé par un autre utilisateur
				if (!isPseudoAvailable(pseudo, locals.user.id)) {
					return fail(400, { 
						success: false, 
						error: 'Un autre utilisateur a déjà ce nom. Veuillez mettre un autre nom.' 
					});
				}
				updateUserPseudo(locals.user.id, pseudo);
			}
			
			// Mise à jour du mot de passe si fourni
			if (password && password.length > 0) {
				if (password.length < 12) {
					return fail(400, { 
						success: false, 
						passwordError: 'Le mot de passe doit contenir au moins 12 caractères' 
					});
				}
				if (password !== confirmPassword) {
					return fail(400, { 
						success: false, 
						passwordError: 'Les mots de passe ne correspondent pas' 
					});
				}
				const hashedPassword = hashSync(password, 10);
				updateUserPassword(locals.user.id, hashedPassword);
			}
			
			// Si l'avatar est un emoji (pas une image avec chemin)
			if (avatar && !avatar.includes('/') && !avatar.startsWith('avatar_')) {
				updateUserAvatar(locals.user.id, avatar);
			}
			
			// Si une nouvelle image a été uploadée
			if (avatarImage && avatarImage.length > 0) {
				updateUserAvatar(locals.user.id, avatarImage);
			}
			
			// Mise à jour de l'heure de disponibilité (en minutes depuis minuit)
			if (minutesFromMidnight >= 0 && minutesFromMidnight <= 1439) {
				updateUserHour(locals.user.id, minutesFromMidnight);
			}
			
			// Mise à jour du fuseau horaire (seulement si fourni et non vide)
			if (timezone && timezone.length > 0) {
				updateUserTimezone(locals.user.id, timezone);
			}
		}
		return { success: true };
	}
};
