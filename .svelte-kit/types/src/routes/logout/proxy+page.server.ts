// @ts-nocheck
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/db';

export const load = async ({ cookies, request }: Parameters<PageServerLoad>[0]) => {
	try {
		const sessionId = cookies.get('session');
		if (sessionId) {
			deleteSession(sessionId);
		}
	} catch (error) {
		console.error('Erreur lors de la suppression de la session:', error);
		// On continue quand même pour déconnecter l'utilisateur
	}
	
	// Détecter si derrière un proxy (comme dans login)
	const forwardedProto = request.headers.get('x-forwarded-proto');
	const isBehindProxy = forwardedProto === 'https';
	
	// Supprimer le cookie avec exactement les mêmes options que lors de la création
	cookies.delete('session', { 
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: isBehindProxy
	});
	
	throw redirect(303, '/login');
};
