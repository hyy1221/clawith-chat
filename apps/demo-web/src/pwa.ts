/**
 * PWA Service: handles SW registration, Web Push notifications,
 * App Badge, and haptic feedback for the mobile workbench.
 */

let swRegistration: ServiceWorkerRegistration | null = null

// ─── Service Worker Registration ─────────────────────────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] ServiceWorker not supported')
    return null
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('[PWA] SW registered:', swRegistration.active ? 'active' : 'installing')

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration?.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] New SW available, refresh to update')
        }
      })
    })

    return swRegistration
  } catch (err) {
    console.error('[PWA] SW registration failed:', err)
    return null
  }
}

// ─── Push Notification Subscription ─────────────────────────────────────────

const PUSH_VAPID_PUBLIC_KEY = '' // TODO: set via openchat.config.js

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!swRegistration) {
    console.warn('[Push] No SW registration')
    return null
  }

  const publicKey = (window as any).__OPENCHAT_CONFIG__?.pushVapidPublicKey || PUSH_VAPID_PUBLIC_KEY
  if (!publicKey) {
    console.log('[Push] No VAPID key configured, skipping subscription')
    return null
  }

  try {
    const existing = await swRegistration.pushManager.getSubscription()
    if (existing) {
      console.log('[Push] Already subscribed')
      return existing
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('[Push] Permission denied')
      return null
    }

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    console.log('[Push] Subscribed:', subscription.endpoint)
    // TODO: send subscription to backend
    // await request('/api/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) })
    return subscription
  } catch (err) {
    console.error('[Push] Subscription failed:', err)
    return null
  }
}

export async function unsubscribePush(): Promise<void> {
  const sub = await swRegistration?.pushManager.getSubscription()
  if (sub) {
    await sub.unsubscribe()
    console.log('[Push] Unsubscribed')
  }
}

// ─── App Badge ───────────────────────────────────────────────────────────────

export function setBadgeCount(count: number): void {
  if (!swRegistration) return

  // Use SW badge API (Chrome 84+)
  if ('setAppBadge' in navigator) {
    ;(navigator as any).setAppBadge(count).catch(() => {})
  }

  // Also update SW badge via API
  if (swRegistration.setBadgeCount) {
    swRegistration.setBadgeCount(count).catch(() => {})
  }
}

export function clearBadge(): void {
  setBadgeCount(0)
}

// ─── Haptic Feedback ─────────────────────────────────────────────────────────

export function vibrate(pattern: number | number[] = [100, 50, 100]): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Short vibrate for notifications
export function vibrateNotify(): void {
  vibrate([80, 40, 80])
}

// ─── Permission Status ───────────────────────────────────────────────────────

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
