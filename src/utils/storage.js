const STORAGE_KEYS = {
  TRIPS: 'roadtrip_saved_trips',
  CURRENT: 'roadtrip_current_trip',
  API_KEY: 'roadtrip_api_key',
  API_URL: 'roadtrip_api_url',
  API_MODEL: 'roadtrip_api_model'
}

export function getTrips() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIPS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTrip(trip) {
  const trips = getTrips()
  const existing = trips.findIndex(t => t.id === trip.id)
  if (existing >= 0) {
    trips[existing] = trip
  } else {
    trips.unshift(trip)
  }
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips))
  return trip
}

export function deleteTrip(id) {
  const trips = getTrips().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips))
}

export function getCurrentTrip() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCurrentTrip(trip) {
  if (trip) {
    localStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(trip))
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT)
  }
}

export function getApiConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.API_URL) || '',
    key: localStorage.getItem(STORAGE_KEYS.API_KEY) || '',
    model: localStorage.getItem(STORAGE_KEYS.API_MODEL) || 'gpt-4o-mini'
  }
}

export function saveApiConfig({ url, key, model }) {
  if (url) localStorage.setItem(STORAGE_KEYS.API_URL, url)
  if (key) localStorage.setItem(STORAGE_KEYS.API_KEY, key)
  if (model) localStorage.setItem(STORAGE_KEYS.API_MODEL, model)
}

export function hasApiConfig() {
  const config = getApiConfig()
  return !!(config.url && config.key)
}

export function generateTripId() {
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
