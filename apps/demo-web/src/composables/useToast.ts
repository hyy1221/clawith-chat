/**
 * Toast notification composable.
 * Renders a non-blocking toast at the bottom of the screen.
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error'

const COLORS: Record<ToastType, string> = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 4000) {
    const color = COLORS[type] || COLORS.info
    const el = document.createElement('div')
    el.style.cssText = [
      'position:fixed',
      'bottom:80px',
      'left:50%',
      'transform:translateX(-50%)',
      `background:${color}`,
      'color:#fff',
      'padding:10px 16px',
      'border-radius:8px',
      'font-size:13px',
      'z-index:99999',
      'opacity:1',
      'transition:opacity 0.3s',
      'max-width:280px',
      'text-align:center',
      'box-shadow:0 2px 8px rgba(0,0,0,0.2)',
      'pointer-events:none',
    ].join(';')
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 300)
    }, duration)
  }

  return { showToast }
}
