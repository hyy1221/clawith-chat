/**
 * Custom Service Worker for OpenChat Mobile Workbench.
 *
 * Handles:
 * - Push notifications from Web Push API
 * - Offline caching via Workbox (CDN import)
 * - Background sync for offline message queuing
 *
 * Workbox is loaded from CDN to enable runtime caching with injectManifest strategy.
 */

// ─── Workbox CDN Import ─────────────────────────────────────────────────────────
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js')

if (workbox) {
  // ── Cache Strategies ─────────────────────────────────────────────────────────

  // NetworkFirst for API calls — falls back to cache when offline.
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 8,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
    })
  )

  // CacheFirst for static assets (JS, CSS, fonts).
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'static-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  )

  // CacheFirst for images.
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'image-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  )

  // StaleWhileRevalidate for HTML navigation requests.
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'pages-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  )

  // ── Precache (built assets from Vite PWA plugin) ─────────────────────────────
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || [])

  // Clean old caches on activate
  workbox.core.clientsClaim()
  workbox.core.skipWaiting()
}

// ─── Push Notification Handler ─────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'OpenChat', body: event.data.text() }
  }

  const { title = 'OpenChat', body = '', icon = '/icon-192.svg', badge = '/icon-192.svg', tag = 'openchat', ...extra } = data

  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: true,
    data: extra,
    actions: [
      { action: 'approve', title: '批准' },
      { action: 'reject', title: '拒绝' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── Notification Click Handler ────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { approval_id, agent_id } = event.notification.data || {}

  if (event.action === 'approve' || event.action === 'reject') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('openchat') && 'focus' in client) {
            client.focus()
            client.postMessage({
              type: 'approval_action',
              action: event.action,
              approval_id,
              agent_id,
            })
            return
          }
        }
        const url = approval_id ? `/?approvalId=${approval_id}` : '/'
        return self.clients.openWindow(url)
      })
    )
  } else {
    event.waitUntil(self.clients.openWindow('/'))
  }
})

// ─── Message Handler (from main app) ───────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data || {}

  if (type === 'skipWaiting') {
    self.skipWaiting()
  }
})
