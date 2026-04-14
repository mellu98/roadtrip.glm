import { getApiConfig } from './storage'

const SYSTEM_PROMPT = `You are an expert travel planner with deep knowledge of destinations worldwide. You create detailed, practical, and exciting travel itineraries.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no extra text. Just the raw JSON object.

The JSON must follow this exact schema:
{
  "title": "Catchy trip title",
  "summary": "2-3 sentence overview of the trip experience",
  "totalEstimatedCost": { "amount": 0, "currency": "EUR" },
  "tips": ["Practical travel tip 1", "Tip 2", "Tip 3"],
  "packingList": ["Essential item 1", "Item 2"],
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "theme": "Short day theme like 'Arrival & Ancient Wonders'",
      "overview": "1-2 sentence summary of the day",
      "activities": [
        {
          "id": "d1a1",
          "type": "attraction|restaurant|transport|activity",
          "name": "Actual real place name",
          "description": "2-3 sentences about this place",
          "time": "09:00",
          "duration": "2h",
          "location": {
            "lat": 0.0,
            "lng": 0.0,
            "address": "Real street address"
          },
          "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
          "rating": 4.5,
          "reviews": 1200,
          "hours": "09:00 - 18:00",
          "phone": "+39 0xx xxx xxxx",
          "website": "https://...",
          "tips": ["Specific useful tip"],
          "cuisine": "Cuisine type (restaurants only)",
          "mealType": "breakfast|lunch|dinner (restaurants only)"
        }
      ],
      "dailyCost": { "amount": 0, "currency": "EUR" }
    }
  ]
}

RULES:
- Use REAL place names, real addresses, real coordinates (approximate is fine)
- Include 2-3 meals per day (breakfast/lunch/dinner) with REAL restaurant names
- Include realistic opening hours and prices in local currency
- Distribute 4-6 activities per day logically by proximity and time
- Consider travel time between locations
- Mix must-see attractions with hidden gems
- Stay within the specified budget
- Every activity needs a unique id like "d1a1", "d1a2", etc.
- Latitude/longitude must be approximate real coordinates for the destination
- Make it exciting, practical, and well-balanced`

export async function generateItinerary(formData) {
  const config = getApiConfig()

  if (!config.url || !config.key) {
    throw new Error('API non configurata. Imposta le tue credenziali nelle impostazioni.')
  }

  const userPrompt = buildUserPrompt(formData)

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 16000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Errore API (${response.status}): ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Risposta API vuota')
  }

  return parseItinerary(content)
}

function buildUserPrompt(formData) {
  const parts = [
    `Destination: ${formData.destination}`,
    `Dates: ${formData.startDate} to ${formData.endDate}`,
    `Duration: ${formData.duration} days`,
    `Budget: ${formData.currency} ${formData.budget} total for the entire trip`,
  ]

  if (formData.travelStyle?.length) {
    parts.push(`Travel style: ${formData.travelStyle.join(', ')}`)
  }
  if (formData.companions) {
    parts.push(`Traveling with: ${formData.companions}`)
  }
  if (formData.interests?.length) {
    parts.push(`Interests: ${formData.interests.join(', ')}`)
  }
  if (formData.dietaryRestrictions) {
    parts.push(`Dietary restrictions: ${formData.dietaryRestrictions}`)
  }
  if (formData.mobilityNeeds) {
    parts.push(`Mobility/accessibility needs: ${formData.mobilityNeeds}`)
  }
  if (formData.mustSee) {
    parts.push(`Must-see places: ${formData.mustSee}`)
  }
  if (formData.additionalNotes) {
    parts.push(`Additional notes: ${formData.additionalNotes}`)
  }

  if (formData.destinationLat && formData.destinationLng) {
    parts.push(`Coordinates: ${formData.destinationLat}, ${formData.destinationLng}`)
  }

  parts.push('\nGenerate a complete, detailed day-by-day itinerary as JSON.')

  return parts.join('\n')
}

function parseItinerary(raw) {
  let text = raw.trim()

  // Strip markdown code blocks if present
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  // First try: parse as-is
  try {
    const parsed = JSON.parse(text)
    validateItinerary(parsed)
    return parsed
  } catch (e) {
    console.warn('Primo tentativo JSON fallito, provo a riparare...', e.message)
  }

  // Second try: extract JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      validateItinerary(parsed)
      return parsed
    } catch {}
  }

  // Third try: repair truncated JSON
  const repaired = repairTruncatedJSON(text)
  if (repaired) {
    try {
      const parsed = JSON.parse(repaired)
      validateItinerary(parsed)
      return parsed
    } catch {}
  }

  throw new Error('Impossibile parsare la risposta JSON. Prova con un viaggio più corto (meno giorni) o riprova.')
}

function repairTruncatedJSON(text) {
  // Remove trailing commas before } or ]
  let cleaned = text.replace(/,\s*([}\]])/g, '$1')

  // Remove incomplete string at the end (unfinished value)
  cleaned = cleaned.replace(/"[^"]*$/, '')

  // Remove trailing comma after last clean value
  cleaned = cleaned.replace(/,\s*$/, '')

  // Count open brackets and close them
  let opens = 0, openSq = 0, inString = false, escaped = false
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') opens++
    if (ch === '}') opens--
    if (ch === '[') openSq++
    if (ch === ']') openSq--
  }

  // Close any open array (activities) then the day object
  while (openSq > 0) { cleaned += ']'; openSq-- }
  while (opens > 0) { cleaned += '}'; opens-- }

  return cleaned
}

function validateItinerary(data) {
  if (!data.days || !Array.isArray(data.days) || data.days.length === 0) {
    throw new Error('Itinerario non valido: mancano i giorni')
  }

  data.days.forEach((day, i) => {
    if (!day.activities || !Array.isArray(day.activities)) {
      throw new Error(`Giorno ${i + 1} non ha attività`)
    }

    day.activities.forEach((act, j) => {
      if (!act.id) act.id = `d${i + 1}a${j + 1}`
      if (!act.location) {
        act.location = { lat: 0, lng: 0, address: '' }
      }
      if (!act.price) {
        act.price = { amount: 0, currency: 'EUR', type: 'free' }
      }
    })
  })

  return data
}
