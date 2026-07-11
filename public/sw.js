const CACHE_NAME = 'learningwar-v1';

const PRECACHE_URLS = [
	'/manifest.json',
	'/icons/icon-192.png',
	'/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only handle GET requests
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Never intercept API/auth/Supabase calls — always go to network,
	// never serve stale data for anything dynamic.
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/auth/') ||
		url.hostname.includes('supabase.co')
	) {
		return;
	}

	// Static assets: cache-first (images, icons, fonts, _next/static)
	if (
		url.pathname.startsWith('/icons/') ||
		url.pathname.startsWith('/_next/static/') ||
		/\.(png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname)
	) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) return cached;
				return fetch(request).then((response) => {
					const clone = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache) => cache.put(request, clone));
					return response;
				});
			}),
		);
		return;
	}

	// Everything else (pages, data): network-first, fall back to cache
	// if offline, so navigation doesn't hard-fail without a connection.
	event.respondWith(
		fetch(request)
			.then((response) => {
				const clone = response.clone();
				caches
					.open(CACHE_NAME)
					.then((cache) => cache.put(request, clone));
				return response;
			})
			.catch(() => caches.match(request)),
	);
});
