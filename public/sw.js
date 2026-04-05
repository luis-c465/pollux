const CACHE_NAME = "pollux-static-v1";
const APP_SHELL_URLS = [
	"/",
	"/_shell.html",
	"/manifest.json",
	"/favicon.ico",
	"/favicon.svg",
	"/logo192.png",
	"/logo512.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const requestUrl = new URL(event.request.url);
	if (requestUrl.origin !== self.location.origin) return;
	if (requestUrl.pathname.startsWith("/api/")) return;

	if (event.request.mode === "navigate") {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					const responseClone = response.clone();
					caches
						.open(CACHE_NAME)
						.then((cache) => cache.put("/", responseClone));
					return response;
				})
				.catch(async () => {
					const cache = await caches.open(CACHE_NAME);
					const shell =
						(await cache.match("/")) ?? (await cache.match("/_shell.html"));
					if (shell) return shell;
					return new Response("Offline", {
						status: 503,
						headers: { "Content-Type": "text/plain" },
					});
				}),
		);
		return;
	}

	const isStaticAsset = /\.(?:js|css|png|svg|ico|woff2?|ttf)$/.test(
		requestUrl.pathname,
	);
	if (!isStaticAsset) return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			const networkFetch = fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const responseClone = response.clone();
						caches
							.open(CACHE_NAME)
							.then((cache) => cache.put(event.request, responseClone));
					}
					return response;
				})
				.catch(() => cached);

			return cached ?? networkFetch;
		}),
	);
});
