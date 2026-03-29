/**
 * Custom Service Worker for OpenChat Mobile Workbench.
 *
 * Handles:
 * - Push notifications from Web Push API
 * - Background sync for offline message queuing
 * - Caching strategies (via Workbox in generated sw.js)
 *
 * Note: vite-plugin-pwa injects the Workbox runtimeCaching rules
 * via importScripts('/sw.js') — this file only adds custom push handling.
 */

// ─── Push Notification Handler ───────────────────────────────────────────────

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

// ─── Notification Click Handler ──────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const { approval_id, agent_id } = event.notification.data || {}

  if (event.action === 'approve' || event.action === 'reject') {
    // Open app and navigate to approval detail
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // If app is already open, focus it
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
        // Otherwise open new window
        const url = approval_id
          ? `/?approvalId=${approval_id}`
          : '/'
        return self.clients.openWindow(url)
      })
    )
  } else {
    // Default click: open app
    event.waitUntil(
      self.clients.openWindow('/')
    )
  }
})

// ─── Message Handler (from main app) ─────────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type, ...data } = event.data || {}

  if (type === 'skipWaiting') {
    self.skipWaiting()
  }
})
