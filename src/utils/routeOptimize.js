import { getApiConfig } from './storage'

/**
 * Ottimizza l'ordine delle attività di un giorno minimizzando gli spostamenti
 * Usa l'IA se disponibile, altrimenti fallback geometrico (nearest-neighbor)
 * @param {Object} context - Itinerario completo
 * @param {number} dayIndex - Indice del giorno da ottimizzare
 * @returns {Promise<Object>} - Il giorno con attività riordinate
 */
export async function optimizeRoute(context, dayIndex) {
  const day = context.days[dayIndex]
  const activities = day.activities || []

  // Separa attività con coordinate da quelle senza
  const withCoords = activities.filter(a => a.location?.lat && a.location?.lng && !(a.location.lat === 0 && a.location.lng === 0))
  const withoutCoords = activities.filter(a => !a.location?.lat || !a.location?.lng || (a.location.lat === 0 && a.location.lng === 0))

  if (withCoords.length < 3) {
    // Pochi punti, non ha senso ottimizzare
    return { ...day, activities }
  }

  // Prova con IA
  try {
    const optimized = await optimizeRouteAI(context, dayIndex)
    return optimized
  } catch {
    // Fallback: nearest-neighbor geometrico
    return optimizeRouteGeometric(day, withCoords, withoutCoords)
  }
}

/**
 * Ottimizzazione percorso con IA
 */
async function optimizeRouteAI(context, dayIndex) {
  const config = getApiConfig()
  if (!config.url || !config.key) {
    throw new Error('API non configurata')
  }

  const day = context.days[dayIndex]
  const activities = day.activities || []

  const activityList = activities.map((a, i) => ({
    index: i,
    id: a.id,
    name: a.name,
    type: a.type,
    time: a.time,
    lat: a.location?.lat,
    lng: a.location?.lng,
  }))

  const prompt = `I need to optimize the route for Day ${day.dayNumber} of a trip to minimize travel distance.

Current activity order:
${activityList.map((a, i) => `${i + 1}. ${a.name} (${a.type}) at ${a.time} - coords: ${a.lat}, ${a.lng}`).join('\n')}

Constraints:
- Keep breakfast activities (type=restaurant, mealType=breakfast) in the morning (before 11:00)
- Keep lunch activities (type=restaurant, mealType=lunch) around 12:00-14:00
- Keep dinner activities (type=restaurant, mealType=dinner) after 19:00
- Adjust times slightly if needed but maintain the general schedule
- Adjust times to account for travel between locations

Return ONLY a JSON array of the optimized order with adjusted times:
[
  { "id": "d1a1", "time": "09:00" },
  { "id": "d1a2", "time": "11:00" },
  ...
]`

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a route optimization expert. Respond with ONLY valid JSON array, no markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) throw new Error('API error')

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response')

  let parsed
  try {
    parsed = JSON.parse(content)
    // L'IA potrebbe restituire un oggetto con una chiave "order" o direttamente un array
    if (Array.isArray(parsed)) {
      // ok
    } else if (parsed.order && Array.isArray(parsed.order)) {
      parsed = parsed.order
    } else if (parsed.optimized && Array.isArray(parsed.optimized)) {
      parsed = parsed.optimized
    } else {
      throw new Error('Unexpected format')
    }
  } catch {
    throw new Error('Invalid route optimization response')
  }

  // Riordina le attività secondo l'ordine ottimizzato
  const newActivities = []
  for (const item of parsed) {
    const act = activities.find(a => a.id === item.id)
    if (act) {
      newActivities.push({
        ...act,
        time: item.time || act.time,
      })
    }
  }

  // Aggiungi attività non trovate nell'ordine ottimizzato
  for (const act of activities) {
    if (!newActivities.find(a => a.id === act.id)) {
      newActivities.push(act)
    }
  }

  // Ri-assegna ID
  newActivities.forEach((act, i) => {
    act.id = `d${dayIndex + 1}a${i + 1}`
  })

  return { ...day, activities: newActivities }
}

/**
 * Fallback: ottimizzazione geometrica nearest-neighbor
 * Non usa l'IA, puro calcolo delle distanze
 */
function optimizeRouteGeometric(day, withCoords, withoutCoords) {
  if (withCoords.length < 2) return day

  const ordered = []
  const remaining = [...withCoords]

  // Inizia dall'attività più a monte (prima per orario, o la prima)
  let current = remaining.shift()
  ordered.push(current)

  while (remaining.length > 0) {
    // Trova l'attività più vicina a quella corrente
    let minDist = Infinity
    let minIdx = 0

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        current.location.lat, current.location.lng,
        remaining[i].location.lat, remaining[i].location.lng
      )
      if (dist < minDist) {
        minDist = dist
        minIdx = i
      }
    }

    current = remaining.splice(minIdx, 1)[0]
    ordered.push(current)
  }

  // Aggiungi attività senza coordinate alla fine
  const allActivities = [...ordered, ...withoutCoords]

  // Ri-assegna ID
  allActivities.forEach((act, i) => {
    act.id = `d${day.dayNumber}a${i + 1}`
  })

  return { ...day, activities: allActivities }
}

/**
 * Distanza haversine tra due punti (in km)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) { return deg * Math.PI / 180 }

/**
 * Calcola la distanza totale del percorso di un giorno (in km)
 */
export function calculateRouteDistance(activities) {
  let total = 0
  for (let i = 0; i < activities.length - 1; i++) {
    const a = activities[i]
    const b = activities[i + 1]
    if (a.location?.lat && a.location?.lng && b.location?.lat && b.location?.lng) {
      total += haversineDistance(a.location.lat, a.location.lng, b.location.lat, b.location.lng)
    }
  }
  return Math.round(total * 10) / 10
}
