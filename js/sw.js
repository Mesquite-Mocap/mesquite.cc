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

<<<<<<< HEAD
// Bump this version string on every deployment to invalidate the old cache.
const CACHE_VERSION = 'mesquite-cc-v3';

// --- local app shell ---
const localFiles = [
=======
// Bump this on every release that touches client JS. The activate handler
// uses the version mismatch as the signal to evict prior caches.
const CACHE_NAME = 'mesquite-cc-v2';

// App-shell precache list. Listed for offline-first behaviour, NOT for
// version pinning -- network-first means we still hit the wire each visit.
// Keep this in sync with the actual files served from the site root.
const APP_SHELL = [
>>>>>>> f465438d9b7444aef040af31c8e1fbbd780bbcb5
  '/index.html',
  '/player.html',
<<<<<<< HEAD
  '/js/main.css',
  '/js/mappings.js',
  '/js/quaternion.min.js',
  '/js/script.js',
  '/js/sw.js',
  '/js/three.min.js',
  '/js/threejsscene.js',
  '/js/threejssceneplayer.js',
  '/js/webserial.js',
  '/js/webserialnative.js',
  '/js/custom_bno_axis_ori.js',
  '/js/custom_bno.js',
  '/js/custom_icm.js',
  '/js/custom_mpu.js',
  '/js/custom.js',
  '/js/face.js',
  '/js/bvh_converter.js',
  '/js/moment.min.js',
  '/js/mi.woff2',
  '/app.webmanifest',
  '/glbs/rig.json',
  '/glbs/rig1.json',
];

// --- external CDN dependencies ---
// These must be pre-cached so the app works offline on first use.
// All jsdelivr mesquite.cc assets use @latest; they are stored in the cache
// under the @latest URL so offline lookups always hit.
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/';
const cdnFiles = [
  // Three.js core + add-ons (used by threejsscene.js module imports)
  CDN_BASE + 'three.module.js',
  CDN_BASE + 'stats.module.js',
  CDN_BASE + 'OrbitControls.js',
  CDN_BASE + 'GLTFLoader.js',
  CDN_BASE + 'KTX2Loader.js',
  CDN_BASE + 'meshopt_decoder.module.js',
  CDN_BASE + 'BVHLoader.js',
  CDN_BASE + 'CCDIKSolver.js',
  CDN_BASE + 'fflate.module.js',
  CDN_BASE + 'zstddec.module.js',
  CDN_BASE + 'ktx-parse.module.js',
  CDN_BASE + 'WorkerPool.js',
  // Three.js gizmo – vendored locally in build-static/
  CDN_BASE + 'three-viewport-gizmo.js',
  // UI / utility libraries loaded by index.html
  'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdn.jsdelivr.net/npm/kalmanjs@1.1.0/lib/kalman.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
];

const appShellFiles = [...localFiles, ...cdnFiles];

// Install: pre-cache app shell and skip waiting so this SW activates immediately
// instead of waiting for all existing tabs to close.
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install', CACHE_VERSION);
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    console.log('[Service Worker] Caching app shell');
    // addAll failures (e.g. missing files) would abort install; use individual
    // puts so a single missing asset doesn't break the whole SW.
    await Promise.allSettled(
      appShellFiles.map(url =>
        fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
      )
    );
    // Take over immediately without waiting for old tabs to close.
=======
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
>>>>>>> f465438d9b7444aef040af31c8e1fbbd780bbcb5
    await self.skipWaiting();
  })());
});

<<<<<<< HEAD
// Activate: delete every cache that is not the current version, then claim all
// existing clients so they start using this SW right away.
self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activate', CACHE_VERSION);
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_VERSION).map(k => {
        console.log('[Service Worker] Deleting old cache', k);
        return caches.delete(k);
      })
=======
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
>>>>>>> f465438d9b7444aef040af31c8e1fbbd780bbcb5
    );
    await self.clients.claim();
  })());
});

<<<<<<< HEAD
// Fetch: network-first for HTML navigation requests so users always receive the
// latest page. Cache-first for everything else (JS, CSS, images, etc.).
self.addEventListener('fetch', (e) => {
  // Only intercept http/https; skip chrome-extension://, file://, etc.
  if (!e.request.url.startsWith('http')) return;

  const isNavigation =
    e.request.mode === 'navigate' ||
    e.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    // Network-first: always try the network so new deployments are picked up
    // immediately; fall back to the cache only when offline.
    e.respondWith((async () => {
      try {
        const response = await fetch(e.request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(e.request, response.clone());
        return response;
      } catch (_) {
        const cached = await caches.match(e.request);
        return cached || Response.error();
      }
    })());
  } else {
    // Cache-first for assets: serve from cache when available, otherwise fetch,
    // cache the response, and return it.
    e.respondWith((async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const response = await fetch(e.request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(e.request, response.clone());
        return response;
      } catch (_) {
        return Response.error();
      }
    })());
  }
});
=======
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
>>>>>>> f465438d9b7444aef040af31c8e1fbbd780bbcb5
