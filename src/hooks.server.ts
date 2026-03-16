import type { Handle } from '@sveltejs/kit';
import { getSession, hasAdmin, refreshSession, generateCSRFToken, validateCSRFToken } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const user = getSession(sessionId);
		if (user) {
			event.locals.user = user;
			// Extend session expiration on each authenticated request (sliding expiration)
			refreshSession(sessionId);
		}
	}
	
	// Generate CSRF token for forms
	const csrfToken = generateCSRFToken(sessionId);
	event.locals.csrfToken = csrfToken;
	
	// Validate CSRF token for POST requests
	if (event.request.method === 'POST') {
		const contentType = event.request.headers.get('content-type') || '';
		
		// Skip CSRF for API endpoints with JSON content (they use different auth)
		if (!event.url.pathname.startsWith('/api') || !contentType.includes('application/json')) {
			const formData = await event.request.clone().formData().catch(() => null);
			if (formData) {
				const token = formData.get('csrf_token')?.toString();
				if (!token || !validateCSRFToken(token, sessionId)) {
					return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}
		}
	}

	// Check if setup is needed - redirect to /setup if no admin exists
	const isSetupPage = event.url.pathname === '/setup';
	const isApi = event.url.pathname.startsWith('/api');
	const isStatic = event.url.pathname.startsWith('/uploads') || 
					 event.url.pathname.startsWith('/static') ||
					 event.url.pathname.includes('.');

	// Only redirect if:
	// - Not already on setup page
	// - Not an API request
	// - Not a static file
	// - No admin exists
	if (!isSetupPage && !isApi && !isStatic && !hasAdmin()) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/setup' }
		});
	}

	const response = await resolve(event);
	
	// En-têtes anti-cache pour TOUTES les réponses
	// Empêche Safari iPhone et autres navigateurs de mettre en cache les pages et API
	response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	response.headers.set('Pragma', 'no-cache');
	response.headers.set('Expires', '0');
	
	return response;
};

// Masquer les détails d'erreur en production
export async function handleError({ error, status }) {
	// En production, ne pas exposer les détails de l'erreur
	return {
		message: 'Une erreur est survenue',
		status
	};
}
