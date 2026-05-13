// =========================================================================
//  MESQUITE.CC SERVICE WORKER
//  Strategy: NETWORK-FIRST with cache fallback.
//
//  Why this matters: the previous strategy was cache-first ("if we have it
//  cached, return it; never look at the network"). That made browsers pin
//  whatever version of webserialnative.js / custom_icm.js / meta.json they
//  cached on first visit. Once a client opened the site in Tempe, their
//  browser served that exact build forever -- subsequent firmware/pipeline
//  fixes had no effect because the JS shipping to their machine never
//  changed. Shipping a fix only worked if the client also knew to clear
//  the service worker cache manually, which they never do.
//
//  Network-first means: always try the live network; if it works, update
//  the cache and serve the fresh response. Only fall back to cache when
//  the network actually fails (offline). End users get fixes the moment
//  they reload, without ever touching DevTools.
//
//  Bumping `CACHE_NAME` further forces the activate handler to delete any
//  old cache namespaces from previous builds, so even a corrupt or stale
//  v1 entry can't survive into v2.
// =========================================================================

// Bump this on every release that touches client JS. The activate handler
// uses the version mismatch as the signal to evict prior caches.
const CACHE_NAME = 'mesquite-cc-v2';

// App-shell precache list. Listed for offline-first behaviour, NOT for
// version pinning -- network-first means we still hit the wire each visit.
// Keep this in sync with the actual files served from the site root.
const APP_SHELL = [
  '/index.html',
  '/arjstest.html',
  '/player.html',
  '/main.css',
  '/mappings.js',
  '/quaternion.min.js',
  '/README.md',
  '/scene.glb',
  '/script.js',
  '/sw.js',
  '/three.min.js',
  '/threejsscene.js',
  '/threejssceneplayer.js',
  '/webserial.js',
  '/webserialnative.js',
  '/custom_bno_axis_ori.js',
  '/custom_bno.js',
  '/custom_icm.js',
  '/custom_mpu.js',
  '/custom.js',
  '/face.js',
  '/facecap.glb',
];

// -------------------------------------------------------------------------
//  install: prefetch the app shell, then immediately skip waiting so the
//  new SW takes over on the next navigation instead of waiting for every
//  tab to close.
// -------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Add files individually so one bad URL doesn't reject the whole batch
    // (addAll is atomic-fail; we want best-effort).
    await Promise.all(APP_SHELL.map(async (url) => {
      try { await cache.add(url); } catch (e) { /* skip missing assets */ }
    }));
    await self.skipWaiting();
  })());
});

// -------------------------------------------------------------------------
//  activate: delete any cache namespace whose name does NOT match the
//  current CACHE_NAME. This is what evicts the stale 'mesquite-cc-v1'
//  contents that have been pinning client browsers to old JS builds.
//  Then claim all open clients so the new SW handles their fetches
//  without requiring a full tab close.
// -------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

// -------------------------------------------------------------------------
//  fetch: network-first with cache fallback.
//   1. Skip non-HTTP(S) schemes (chrome-extension://, file://, etc.) --
//      the cache API can't store those and the old code crashed on them.
//   2. Skip cross-origin requests entirely -- CDN responses are typed
//      'opaque' and pollute the cache with nothing we can actually serve.
//   3. For our own assets: try the network. On success, refresh the cache
//      copy in the background and return the live response. On failure,
//      serve whatever the cache has (so the page still runs offline).
// -------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; anything else (POST, etc.) goes straight to the wire.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin HTTP(S) only.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Only cache successful basic responses. 4xx/5xx and opaque go
      // straight through without touching the cache.
      if (fresh && fresh.ok && fresh.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        // clone() because Response bodies can only be read once.
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // Network unreachable -- fall back to the cached copy if we have one.
      const cached = await caches.match(req);
      if (cached) return cached;
      // Truly nothing -- let the browser surface the error.
      throw err;
    }
  })());
});
