import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
	try {
		const sessionId = cookies.get('session');
		if (sessionId) {
			deleteSession(sessionId);
		}
	} catch (error) {
		console.error('Erreur lors de la suppression de la session:', error);
		// On continue quand même pour déconnecter l'utilisateur
	}
	
	// Toujours supprimer le cookie, même en cas d'erreur
	cookies.delete('session', { path: '/' });
	
	throw redirect(303, '/login');
};
