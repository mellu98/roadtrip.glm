import { getApiConfig } from '../utils/storage'

/**
 * Rigenera un singolo giorno dell'itinerario
 * @param {Object} context - Contesto dell'itinerario completo
 * @param {number} dayIndex - Indice del giorno da rigenerare
 * @param {Object} preferences - Preferenze opzionali per la rigenerazione
 * @returns {Promise<Object>} - Il nuovo giorno generato
 */
export async function regenerateDay(context, dayIndex, preferences = {}) {
  const config = getApiConfig()
  if (!config.url || !config.key) {
    throw new Error('API non configurata')
  }

  const day = context.days[dayIndex]
  const systemPrompt = buildRegenerateSystemPrompt('day')
  const userPrompt = buildRegenerateDayPrompt(context, dayIndex, preferences)

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Errore API (${response.status}): ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Risposta API vuota')

  return parseRegenerationResult(content, 'day')
}

/**
 * Rigenera una singola attività
 * @param {Object} context - Contesto dell'itinerario completo
 * @param {string} activityId - ID dell'attività da rigenerare
 * @param {Object} preferences - Preferenze opzionali
 * @returns {Promise<Object>} - La nuova attività generata
 */
export async function regenerateActivity(context, activityId, preferences = {}) {
  const config = getApiConfig()
  if (!config.url || !config.key) {
    throw new Error('API non configurata')
  }

  // Trova l'attività e il giorno
  let targetActivity = null
  let dayIndex = -1
  for (let d = 0; d < context.days.length; d++) {
    const found = context.days[d].activities?.find(a => a.id === activityId)
    if (found) {
      targetActivity = found
      dayIndex = d
      break
    }
  }

  if (!targetActivity) throw new Error('Attività non trovata')

  const systemPrompt = buildRegenerateSystemPrompt('activity')
  const userPrompt = buildRegenerateActivityPrompt(context, dayIndex, targetActivity, preferences)

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Errore API (${response.status}): ${err}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Risposta API vuota')

  return parseRegenerationResult(content, 'activity')
}

/**
 * Rigenera solo i ristoranti di un giorno
 */
export async function regenerateMeals(context, dayIndex) {
  const day = context.days[dayIndex]
  const mealActivities = day.activities?.filter(a => a.type === 'restaurant') || []

  return regenerateDay(context, dayIndex, {
    focus: 'meals',
    instruction: `Sostituisci TUTTI i ristoranti con alternative diverse e migliori. Mantieni le stesse fascce orarie (colazione, pranzo, cena). Ci sono ${mealActivities.length} ristoranti da sostituire.`,
    keepTypes: ['attraction', 'activity', 'transport', 'accommodation'],
  })
}

// --- Prompt Builders ---

function buildRegenerateSystemPrompt(type) {
  if (type === 'day') {
    return `You are an expert travel planner. You are regenerating a SINGLE DAY of an existing itinerary.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks.

The JSON must follow this schema:
{
  "dayNumber": 1,
  "date": "YYYY-MM-DD",
  "theme": "Short day theme",
  "overview": "1-2 sentence summary",
  "activities": [
    {
      "id": "d1a1",
      "type": "attraction|restaurant|transport|activity",
      "name": "Real place name",
      "description": "2-3 sentences",
      "time": "09:00",
      "duration": "2h",
      "location": { "lat": 0.0, "lng": 0.0, "address": "Real address" },
      "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
      "rating": 4.5,
      "hours": "09:00-18:00",
      "tips": ["Tip"]
    }
  ],
  "dailyCost": { "amount": 0, "currency": "EUR" }
}

RULES:
- Use REAL place names, addresses, coordinates
- Include 2-3 meals per day
- Distribute 4-6 activities logically
- Stay within the original budget
- Every activity needs a unique id`
  }

  if (type === 'activity') {
    return `You are an expert travel planner. You are regenerating a SINGLE ACTIVITY in an existing itinerary day.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks.

The JSON must be a single activity object:
{
  "id": "d1a1",
  "type": "attraction|restaurant|transport|activity",
  "name": "Real place name",
  "description": "2-3 sentences",
  "time": "09:00",
  "duration": "2h",
  "location": { "lat": 0.0, "lng": 0.0, "address": "Real address" },
  "price": { "amount": 0, "currency": "EUR", "type": "per person|total|free" },
  "rating": 4.5,
  "hours": "09:00-18:00",
  "tips": ["Tip"]
}

RULES:
- Use REAL place names and addresses
- Keep the same time slot as the original activity
- Keep the same type unless instructed otherwise
- Must be a different place from the original
- Coordinates must be approximate real coordinates`
  }
}

function buildRegenerateDayPrompt(context, dayIndex, preferences) {
  const day = context.days[dayIndex]
  const formData = context.formData

  let prompt = `I'm regenerating Day ${day.dayNumber} of my trip to ${formData.destination}.

TRIP CONTEXT:
- Destination: ${formData.destination}
- Budget: ${formData.currency} ${formData.budget} total
- Travel style: ${formData.travelStyle?.join(', ') || 'mixed'}
- Interests: ${formData.interests?.join(', ') || 'general'}

CURRENT DAY TO REGENERATE:
- Date: ${day.date}
- Theme: ${day.theme}

`

  if (preferences.focus === 'meals') {
    prompt += `SPECIAL INSTRUCTION: ${preferences.instruction}\n\n`
    prompt += `NON-RESTAURANT activities to KEEP (do not change these):\n`
    day.activities?.forEach(act => {
      if (act.type !== 'restaurant') {
        prompt += `- ${act.time} ${act.name} (${act.type})\n`
      }
    })
    prompt += `\nGenerate ONLY the replacement restaurant activities plus the kept activities, returning the complete day.`
  } else {
    prompt += `Generate a completely new plan for this day with different places and activities.`
    if (preferences.instruction) {
      prompt += `\n\nAdditional instructions: ${preferences.instruction}`
    }
  }

  // Contesto giorni adiacenti per evitare duplicati
  if (dayIndex > 0) {
    const prevDay = context.days[dayIndex - 1]
    prompt += `\n\nPREVIOUS DAY activities (avoid duplicates): ${prevDay.activities?.map(a => a.name).join(', ')}`
  }
  if (dayIndex < context.days.length - 1) {
    const nextDay = context.days[dayIndex + 1]
    prompt += `\nNEXT DAY activities (avoid duplicates): ${nextDay.activities?.map(a => a.name).join(', ')}`
  }

  return prompt
}

function buildRegenerateActivityPrompt(context, dayIndex, activity, preferences) {
  const formData = context.formData
  const day = context.days[dayIndex]

  let prompt = `I'm replacing a single activity in my trip to ${formData.destination}.

DAY CONTEXT:
- Date: ${day.date}
- Other activities this day: ${day.activities?.filter(a => a.id !== activity.id).map(a => `${a.time} ${a.name}`).join(', ')}

ACTIVITY TO REPLACE:
- Name: ${activity.name}
- Type: ${activity.type}
- Time: ${activity.time}
- Duration: ${activity.duration}

`

  if (preferences.instruction) {
    prompt += `SPECIAL INSTRUCTION: ${preferences.instruction}\n\n`
  } else {
    prompt += `Generate a DIFFERENT ${activity.type} at the same time slot (${activity.time}).\n`
  }

  if (preferences.keepType && preferences.keepType !== activity.type) {
    prompt += `Change the type to: ${preferences.keepType}\n`
  }

  prompt += `\nReturn a single activity object with id "${activity.id}".`

  return prompt
}

// --- Parser ---

function parseRegenerationResult(raw, type) {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }
    throw new Error('Impossibile parsare la risposta di rigenerazione')
  }
}
