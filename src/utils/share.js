import lz from 'lz-string'

/**
 * Codifica un viaggio in URL (hash fragment compresso)
 * @param {Object} trip - L'oggetto viaggio completo
 * @returns {string} - URL con hash fragment
 */
export function encodeTripToUrl(trip) {
  if (!trip) return ''

  // Riduci il payload: rimuovi campi pesanti non necessari per la visualizzazione
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
 * Decodifica un viaggio dall'URL
 * @returns {Object|null} - L'oggetto viaggio o null
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
 * Verifica se l'URL contiene un viaggio condiviso
 */
export function isSharedTrip() {
  return window.location.hash.startsWith('#trip=')
}

/**
 * Genera un link di condivisione
 */
export function generateShareLink(trip) {
  const url = encodeTripToUrl(trip)
  // Verifica che l'URL non sia troppo lungo (limite ~2000 caratteri per sicurezza)
  if (url.length > 4000) {
    console.warn('URL di condivisione troppo lungo:', url.length, 'caratteri')
    return null
  }
  return url
}

/**
 * Copia un link negli appunti
 */
export async function copyShareLink(trip) {
  const link = generateShareLink(trip)
  if (!link) return false

  try {
    await navigator.clipboard.writeText(link)
    return true
  } catch {
    // Fallback per browser senza clipboard API
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
 * Pulisce l'hash dall'URL dopo aver caricato un viaggio condiviso
 */
export function clearShareHash() {
  if (window.location.hash.startsWith('#trip=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}
