const CACHE_VERSION = 'v7';
const CACHE_NAME_IMAGES = `mateclub-images-${CACHE_VERSION}`;
const CACHE_NAME_AUDIO = `mateclub-audio-${CACHE_VERSION}`;
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000; // 3 mois en millisecondes

// Assets statiques à mettre en cache immédiatement (uniquement les essentiels PWA)
const urlsToCache = [
	'/manifest.json',
	'/favicon.ico',
	'/icon-192x192.png',
	'/icon-512x512.png',
	'/apple-touch-icon.png'
];

// Installation - Mise en cache initiale des assets PWA uniquement
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME_IMAGES)
			.then(cache => cache.addAll(urlsToCache))
			.catch(err => console.error('SW Install error:', err))
	);
	self.skipWaiting();
});

// Activation - Nettoyage des anciens caches
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames
					.filter(name => name.startsWith('mateclub-') && !name.includes(CACHE_VERSION))
					.map(name => {
						console.log('Deleting old cache:', name);
						return caches.delete(name);
					})
			);
		})
	);
	self.clients.claim();
});

// Fonction utilitaire : vérifier si une entrée de cache est expirée (> 3 mois)
async function isCacheEntryExpired(response) {
	if (!response) return true;
	const dateHeader = response.headers.get('sw-cached-date');
	if (!dateHeader) return true;
	const cachedTime = parseInt(dateHeader, 10);
	return (Date.now() - cachedTime) > CACHE_DURATION;
}

// Fonction utilitaire : ajouter la date de cache
function addCacheDateHeader(response) {
	const newHeaders = new Headers(response.headers);
	newHeaders.set('sw-cached-date', Date.now().toString());
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
}

// Stratégie Cache-First avec expiration pour images et audio
async function cacheFirstWithExpiry(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	
	// Si on a une version en cache et qu'elle n'est pas expirée, la servir
	if (cached && !await isCacheEntryExpired(cached)) {
		return cached;
	}
	
	// Sinon, fetch depuis le réseau
	try {
		const networkResponse = await fetch(request);
		if (networkResponse.ok) {
			// Ajouter la date de cache et stocker
			const responseToCache = addCacheDateHeader(networkResponse.clone());
			cache.put(request, responseToCache);
		}
		return networkResponse;
	} catch (err) {
		// En cas d'erreur réseau, servir le cache même s'il est expiré (offline)
		if (cached) {
			console.log('Network failed, serving expired cache:', request.url);
			return cached;
		}
		throw err;
	}
}

// Gestion des requêtes fetch - MINIMAL
self.addEventListener('fetch', event => {
	const url = new URL(event.request.url);
	
	// Ne pas intercepter les requêtes non-GET
	if (event.request.method !== 'GET') {
		return;
	}
	
	// 1. Images et avatars : Cache-First avec expiration 3 mois
	if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/)) {
		event.respondWith(
			cacheFirstWithExpiry(event.request, CACHE_NAME_IMAGES).catch(() => {
				return new Response('Image not available', { status: 404 });
			})
		);
		return;
	}
	
	// 2. Fichiers audio : Cache-First avec expiration 3 mois
	// Permet réécoute offline des capsules déjà écoutées
	if (url.pathname.match(/\.(m4a|webm|mp3|ogg|wav)$/)) {
		event.respondWith(
			cacheFirstWithExpiry(event.request, CACHE_NAME_AUDIO).catch(() => {
				return new Response('Audio not available', { status: 404 });
			})
		);
		return;
	}
	
	// 3. TOUTES les autres requêtes (pages, API, etc.) : PASSER DIRECTEMENT
	// Ne pas intercepter - laisser le navigateur gérer normalement
	// Cela évite TOUT problème de cache sur les pages et API
});

// Gestion des messages depuis l'app (pour forcer le skipWaiting si besoin)
self.addEventListener('message', event => {
	if (event.data === 'skipWaiting') {
		self.skipWaiting();
	}
});
