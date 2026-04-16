import lz from 'lz-string'

/**
 * Encode a trip into URL (compressed hash fragment)
 * @param {Object} trip - The full trip object
 * @returns {string} - URL with hash fragment
 */
export function encodeTripToUrl(trip) {
  if (!trip) return ''

  // Reduce payload: remove heavy fields not needed for display
  const lightweight = {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    summary: trip.summary,
    totalEstimatedCost: trip.totalEstimatedCost,
    tips: trip.tips,
    days: trip.days?.map(day => ({
      dayNumber: day.dayNumber,
      date: day.date,
      theme: day.theme,
      overview: day.overview,
      dailyCost: day.dailyCost,
      activities: day.activities?.map(act => ({
        id: act.id,
        type: act.type,
        name: act.name,
        description: act.description,
        time: act.time,
        duration: act.duration,
        location: act.location,
        price: act.price,
        rating: act.rating,
        hours: act.hours,
        tips: act.tips,
        cuisine: act.cuisine,
        mealType: act.mealType,
      })),
    })),
  }

  const json = JSON.stringify(lightweight)
  const compressed = lz.compressToEncodedURIComponent(json)
  return `${window.location.origin}${window.location.pathname}#trip=${compressed}`
}

/**
 * Decode a trip from URL
 * @returns {Object|null} - The trip object or null
 */
export function decodeTripFromUrl() {
  const hash = window.location.hash
  if (!hash.startsWith('#trip=')) return null

  try {
    const compressed = hash.slice(6) // Remove '#trip='
    const json = lz.decompressFromEncodedURIComponent(compressed)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

/**
 * Check if the URL contains a shared trip
 */
export function isSharedTrip() {
  return window.location.hash.startsWith('#trip=')
}

/**
 * Generate a share link
 */
export function generateShareLink(trip) {
  const url = encodeTripToUrl(trip)
  // Modern browsers support much longer URLs (Chrome ~2MB, Safari ~80k)
  if (url.length > 16000) {
    console.warn('Share URL too long:', url.length, 'characters')
    return null
  }
  return url
}

/**
 * Copy a link to clipboard
 */
export async function copyShareLink(trip) {
  const link = generateShareLink(trip)
  if (!link) return false

  try {
    await navigator.clipboard.writeText(link)
    return true
  } catch {
    // Fallback for browsers without clipboard API
    const textarea = document.createElement('textarea')
    textarea.value = link
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

/**
 * Clear the hash from URL after loading a shared trip
 */
export function clearShareHash() {
  if (window.location.hash.startsWith('#trip=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
