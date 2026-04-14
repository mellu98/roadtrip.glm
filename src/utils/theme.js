const THEME_KEY = 'roadtrip_theme'

export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) return saved // 'light' | 'dark' | 'system'
  return 'system'
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#1a1a2e' : '#1a1a2e')
  }
}

export function resolveTheme(theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function listenToSystemTheme(callback) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e) => {
    const current = getTheme()
    if (current === 'system') {
      callback(e.matches ? 'dark' : 'light')
    }
  }
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
