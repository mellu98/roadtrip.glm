export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

export function onConnectionChange(callback) {
  if (typeof window === 'undefined') return () => {}
  
  const handler = () => callback(navigator.onLine)
  window.addEventListener('online', handler)
  window.addEventListener('offline', handler)
  return () => {
    window.removeEventListener('online', handler)
    window.removeEventListener('offline', handler)
  }
}
