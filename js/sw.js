
// Bump this version string on every deployment to invalidate the old cache.
const CACHE_VERSION = 'mesquite-cc-v3';

// --- local app shell ---
const localFiles = [
  '/index.html',
  '/player.html',
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
    await self.skipWaiting();
  })());
});

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
    );
    await self.clients.claim();
  })());
});

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