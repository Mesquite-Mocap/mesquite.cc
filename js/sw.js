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
const CACHE_NAME = 'mesquite-cc-v4';

// -------------------------------------------------------------------------
//  App-shell precache list.
//  Pre-fetched during install so the app works offline on the very first
//  visit (not just after a prior online session).
//  Keep this in sync with the files actually served by the site.
// -------------------------------------------------------------------------
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/';

const APP_SHELL = [
  // local pages & assets
  '/index.html',
  '/player.html',
  '/js/main.css',
  '/js/mappings.js',
  '/js/quaternion.min.js',
  '/js/script.js',
  '/js/sw.js',
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
  // Three.js core + add-ons (module imports in threejsscene.js)
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
  CDN_BASE + 'three-viewport-gizmo.js',
  // UI / utility libraries
  'https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://cdn.jsdelivr.net/npm/kalmanjs@1.1.0/lib/kalman.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css',
];

// -------------------------------------------------------------------------
//  install: prefetch the app shell, then immediately skip waiting so the
//  new SW takes over on the next navigation instead of waiting for every
//  tab to close.
// -------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Fetch individually so one bad URL doesn't reject the whole batch.
    await Promise.allSettled(
      APP_SHELL.map(url =>
        fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
      )
    );
    await self.skipWaiting();
  })());
});

// -------------------------------------------------------------------------
//  activate: delete any cache namespace whose name does NOT match the
//  current CACHE_NAME, then claim all open clients so the new SW handles
//  their fetches without requiring a full tab close.
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
//  fetch: network-first with cache fallback for ALL GET requests.
//   • Non-HTTP(S) schemes (chrome-extension://, file://, etc.) are skipped.
//   • Both same-origin (basic) and CORS-enabled CDN (cors) responses are
//     cached. jsDelivr, cdnjs, and Google CDN all send Access-Control-Allow-
//     Origin headers, so their responses are type 'cors', not 'opaque'.
//   • Opaque responses (type 'opaque') are NOT cached – they have an unknown
//     status and a size-inflated quota cost.
//   • On network failure the cached copy is served (offline fallback).
// -------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only intercept GET; POST etc. go straight to the wire.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Cache successful basic (same-origin) and cors (CDN) responses only.
      if (fresh && fresh.ok && (fresh.type === 'basic' || fresh.type === 'cors')) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // Network unreachable – serve whatever the cache has.
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
