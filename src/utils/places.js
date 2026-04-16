const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const CACHE_KEY = 'roadtrip_places_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setCacheEntry(key, data) {
  try {
    const cache = getCache()
    cache[key] = { data, timestamp: Date.now() }
    // Limit cache to 100 entries
    const keys = Object.keys(cache)
    if (keys.length > 100) {
      const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0]
      delete cache[oldest]
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

function getCachedEntry(key) {
  const cache = getCache()
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) return null
  return entry.data
}

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100 // 1.1s to respect Nominatim policy (1 req/s)

async function rateLimitedFetch(url) {
  const now = Date.now()
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime))
  if (wait > 0) {
    await new Promise(resolve => setTimeout(resolve, wait))
  }
  lastRequestTime = Date.now()
  
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  })
  return res
}

/**
 * Search places via Nominatim (OpenStreetMap)
 * @param {string} query - Search text
 * @returns {Promise<Array>} - Array of results
 */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return []

  const cacheKey = `search_${query.trim().toLowerCase()}`
  const cached = getCachedEntry(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: 'json',
      limit: '6',
      addressdetails: '1',
    })

    const res = await rateLimitedFetch(`${NOMINATIM_BASE}/search?${params}`)
    if (!res.ok) return []

    const data = await res.json()

    const results = data.map(item => ({
      name: item.display_name?.split(',')[0] || item.name || '',
      fullName: item.display_name || '',
      type: item.type || '',
      category: item.category || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      importance: item.importance || 0,
    }))

    setCacheEntry(cacheKey, results)
    return results
  } catch {
    return []
  }
}

/**
 * Geocode a place (from name to coordinates)
 * @param {string} location - Place name
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocode(location) {
  if (!location) return null

  const cacheKey = `geocode_${location.toLowerCase()}`
  const cached = getCachedEntry(cacheKey)
  if (cached) return cached

  try {
    const results = await searchPlaces(location)
    if (results.length > 0) {
      const { lat, lng } = results[0]
      const result = { lat, lng }
      setCacheEntry(cacheKey, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

/**
 * Reverse geocode (from coordinates to name)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null

  const cacheKey = `reverse_${lat.toFixed(4)}_${lng.toFixed(4)}`
  const cached = getCachedEntry(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
    })

    const res = await rateLimitedFetch(`${NOMINATIM_BASE}/reverse?${params}`)
    if (!res.ok) return null

    const data = await res.json()
    const name = data.display_name || null
    if (name) setCacheEntry(cacheKey, name)
    return name
  } catch {
    return null
  }
}
