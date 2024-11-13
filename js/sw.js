
// Files to cache
const cacheName = 'mesquite-cc-v1';
const appShellFiles = [
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
  '/custom_bno_axis_ori.js',
  '/custom_bno.js',
  '/custom_icm.js',
  '/custom_mpu.js',
  '/custom.js',
  '/face.js',
  '/facecap.glb'
];

const contentToCache = appShellFiles;

// Installing Service Worker
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
  e.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    console.log('[Service Worker] Caching all: app shell and content');
    await cache.addAll(contentToCache);
  })());
});

// Fetching content using Service Worker
self.addEventListener('fetch', (e) => {
    // Cache http and https only, skip unsupported chrome-extension:// and file://...
    if (!(
       e.request.url.startsWith('http:') || e.request.url.startsWith('https:')
    )) {
        return; 
    }

  e.respondWith((async () => {
    const r = await caches.match(e.request);
    //console.log(`[Service Worker] Fetching resource: ${e.request.url}`);
    if (r) return r;
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    //console.log(`[Service Worker] Caching new resource: ${e.request.url}`);
    cache.put(e.request, response.clone());
    return response;
  })());
});