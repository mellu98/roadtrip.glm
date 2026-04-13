export function openInMaps(location) {
  const url = getMapsSearchUrl(location)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getMapsSearchUrl(location) {
  if (location?.lat && location?.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
  }
  if (location?.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`
  }
  return 'https://maps.google.com'
}

export function getDirectionsUrl(location) {
  if (location?.lat && location?.lng) {
    return `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
  }
  if (location?.address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`
  }
  return 'https://maps.google.com'
}

export function openDirections(location) {
  const url = getDirectionsUrl(location)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getStaticMapUrl(location, zoom = 15) {
  if (!location?.lat || !location?.lng) return null
  return `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=${zoom}&size=400x200&markers=${location.lat},${location.lng}`
}

export function formatAddress(location) {
  if (!location) return ''
  return location.address || `${location.lat?.toFixed(4)}, ${location.lng?.toFixed(4)}`
}
