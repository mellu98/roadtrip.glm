import pb from '../lib/pb'

/**
 * Optimize the order of activities in a day by minimizing travel distance
 * Uses AI via PocketBase proxy, with geometric fallback
 */
export async function optimizeRoute(context, dayIndex) {
  const day = context.days[dayIndex]
  const activities = day.activities || []

  const withCoords = activities.filter(a => a.location?.lat && a.location?.lng && !(a.location.lat === 0 && a.location.lng === 0))
  const withoutCoords = activities.filter(a => !a.location?.lat || !a.location?.lng || (a.location.lat === 0 && a.location.lng === 0))

  if (withCoords.length < 3) {
    return { ...day, activities }
  }

  try {
    return await optimizeRouteAI(context, dayIndex)
  } catch {
    return optimizeRouteGeometric(day, withCoords, withoutCoords)
  }
}

async function optimizeRouteAI(context, dayIndex) {
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

  // Use the chat endpoint for route optimization (it shares the rate limit)
  const content = await sendChatRequest(
    'You are a route optimization expert. Respond with ONLY valid JSON array, no markdown.',
    prompt
  )

  let parsed
  try {
    parsed = JSON.parse(content)
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

  const newActivities = []
  for (const item of parsed) {
    const act = activities.find(a => a.id === item.id)
    if (act) {
      newActivities.push({ ...act, time: item.time || act.time })
    }
  }
  for (const act of activities) {
    if (!newActivities.find(a => a.id === act.id)) {
      newActivities.push(act)
    }
  }

  newActivities.forEach((act, i) => {
    act.id = `d${dayIndex + 1}a${i + 1}`
  })

  return { ...day, activities: newActivities }
}

async function sendChatRequest(systemPrompt, userPrompt) {
  const result = await pb.send('/api/chat', {
    method: 'POST',
    body: {
      tripId: null,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    }
  })
  return result.content
}

function optimizeRouteGeometric(day, withCoords, withoutCoords) {
  if (withCoords.length < 2) return day

  const ordered = []
  const remaining = [...withCoords]

  let current = remaining.shift()
  ordered.push(current)

  while (remaining.length > 0) {
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

  const allActivities = [...ordered, ...withoutCoords]
  allActivities.forEach((act, i) => {
    act.id = `d${day.dayNumber}a${i + 1}`
  })

  return { ...day, activities: allActivities }
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) { return deg * Math.PI / 180 }

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
