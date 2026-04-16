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
  const root = document.documentElement
  // HeroUI + Tailwind use class-based dark mode
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  // Keep data-theme for any legacy CSS that still relies on it
  root.setAttribute('data-theme', resolved)
  // Update meta theme-color for mobile browsers
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0a0a12' : '#6366f1')
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
