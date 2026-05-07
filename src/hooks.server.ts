import type { Handle } from '@sveltejs/kit';
import { getSession, hasAdmin, refreshSession, generateCSRFToken, validateCSRFToken, periodicCleanup } from '$lib/server/db';
import { initializePushScheduler } from '$lib/server/push';

initializePushScheduler();

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');

	// Nettoyage périodique des données expirées
	periodicCleanup();

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
	
	// Validate CSRF token for POST requests (only for non-API routes)
	if (event.request.method === 'POST' && !event.url.pathname.startsWith('/api')) {
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

	// Validate CSRF for API routes - block form-based CSRF attacks
	// (fetch/XHR use application/json or multipart, forms use x-www-form-urlencoded)
	if (event.request.method !== 'GET' && event.url.pathname.startsWith('/api')) {
		const contentType = event.request.headers.get('content-type') || '';
		// Block only classic form submissions (cannot send JSON or custom headers)
		if (contentType.includes('application/x-www-form-urlencoded') || 
			contentType.includes('text/plain')) {
			return new Response(JSON.stringify({ error: 'CSRF rejected' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
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
	
	response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	response.headers.set('Pragma', 'no-cache');
	response.headers.set('Expires', '0');
	
	response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:;");
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	
	return response;
};

// Masquer les détails d'erreur en production
export async function handleError({ status }: { status: number }) {
	// En production, ne pas exposer les détails de l'erreur
	return {
		message: 'Une erreur est survenue',
		status
	};
}
