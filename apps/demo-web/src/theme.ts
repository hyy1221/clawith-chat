/**
 * Theme system: follows OS preference by default,
 * allows manual override stored in localStorage.
 */

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'openchat-theme'

// Read stored preference, default to 'system'
export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
}

// Resolve effective theme (system → actual)
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  const effective = getEffectiveTheme(theme)
  document.documentElement.setAttribute('data-theme', effective)
}

// Initialize: apply stored preference + listen for system changes
export function initTheme(): void {
  const stored = getStoredTheme()
  applyTheme(stored)

  // React to OS theme changes (only if using system preference)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
    }
  })
}
