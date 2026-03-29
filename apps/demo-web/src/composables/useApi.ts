/**
 * API request composable with auth header injection.
 */
import { ref } from 'vue'

export function useApi(config: { apiBaseUrl: string }, token: { value: string }, logout: () => void) {
  const busy = ref(false)

  async function request<T = any>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
    const res = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        ...(options.headers || {}),
      },
    })

    if (res.status === 401 && auth) {
      logout()
      throw new Error('登录过期')
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    if (res.status === 204) return null as T
    return res.json()
  }

  return { request, busy }
}
