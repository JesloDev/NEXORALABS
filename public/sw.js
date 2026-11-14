/* NEXORALABS service worker.
 * - Pages: network first, fall back to /offline.html when there is no connection.
 * - Static assets (/_next/static, icons, brand): cache first.
 * - NEVER caches /api, auth or socket.io traffic (private, always live).
 * Bump VERSION to force clients to drop old caches. */
const VERSION = 'v1'
const STATIC = `nexora-static-${VERSION}`
const PAGES = `nexora-pages-${VERSION}`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // chat service, fonts, etc. go straight to the network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)) }
        return res
      })),
    )
  }
})
