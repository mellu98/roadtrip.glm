/**
 * Export del viaggio in formato JSON (backup completo)
 */
export function exportJSON(trip) {
  const json = JSON.stringify(trip, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `${sanitizeFilename(trip.title || 'viaggio')}.json`)
}

/**
 * Import di un viaggio da file JSON
 */
export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const trip = JSON.parse(e.target.result)
        if (!trip.days || !Array.isArray(trip.days)) {
          reject(new Error('Formato JSON non valido: manca il campo "days"'))
          return
        }
        resolve(trip)
      } catch (err) {
        reject(new Error('File JSON non valido: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Errore nella lettura del file'))
    reader.readAsText(file)
  })
}

/**
 * Export del viaggio in formato iCal (eventi calendario)
 */
export function exportICal(trip) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RoadTrip Planner//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  trip.days?.forEach(day => {
    day.activities?.forEach(act => {
      if (!act.time) return

      const date = day.date?.replace(/-/g, '') // YYYYMMDD
      const time = act.time.replace(':', '') + '00' // HHmmss
      const startDT = `${date}T${time}`

      // Durata stimata (default 1 ora)
      let durationHours = 1
      if (act.duration) {
        const match = act.duration.match(/(\d+)/)
        if (match) durationHours = parseInt(match[1])
      }
      const endMinutes = parseInt(act.time.split(':')[1]) + durationHours * 60
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${String(endHours).padStart(2, '0')}${String(endMins).padStart(2, '0')}00`
      const endDT = `${date}T${endTime}`

      lines.push('BEGIN:VEVENT')
      lines.push(`DTSTART:${startDT}`)
      lines.push(`DTEND:${endDT}`)
      lines.push(`SUMMARY:${escapeICal(act.name || 'Attività')}`)
      if (act.description) lines.push(`DESCRIPTION:${escapeICal(act.description)}`)
      if (act.location?.address) lines.push(`LOCATION:${escapeICal(act.location.address)}`)
      lines.push(`UID:roadtrip-${trip.id}-${act.id}`)
      lines.push('END:VEVENT')
    })
  })

  lines.push('END:VCALENDAR')

  const content = lines.join('\r\n')
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(trip.title || 'viaggio')}.ics`)
}

/**
 * Export del viaggio in formato Markdown
 */
export function exportMarkdown(trip) {
  let md = `# ${trip.title || 'Il Tuo Viaggio'}\n\n`

  if (trip.summary) md += `> ${trip.summary}\n\n`

  if (trip.startDate && trip.endDate) {
    md += `**Date:** ${trip.startDate} → ${trip.endDate}\n\n`
  }

  if (trip.totalEstimatedCost) {
    md += `**Budget stimato:** ${trip.totalEstimatedCost.currency} ${trip.totalEstimatedCost.amount}\n\n`
  }

  if (trip.tips?.length) {
    md += `## 💡 Consigli\n\n`
    trip.tips.forEach(tip => { md += `- ${tip}\n` })
    md += '\n'
  }

  trip.days?.forEach(day => {
    md += `## Giorno ${day.dayNumber} — ${day.theme || ''}\n\n`
    if (day.date) md += `**Data:** ${day.date}\n\n`
    if (day.overview) md += `${day.overview}\n\n`

    day.activities?.forEach(act => {
      const icon = getActivityIconMd(act.type)
      md += `### ${icon} ${act.name}\n\n`
      if (act.time) md += `- **Orario:** ${act.time}`
      if (act.duration) md += ` (${act.duration})`
      md += '\n'
      if (act.price?.amount) md += `- **Prezzo:** ${act.price.currency || ''} ${act.price.amount}${act.price.type === 'per person' ? '/persona' : ''}\n`
      if (act.rating) md += `- **Valutazione:** ★ ${act.rating}/5\n`
      if (act.description) md += `- ${act.description}\n`
      if (act.location?.address) md += `- 📍 ${act.location.address}\n`
      md += '\n'
    })

    if (day.dailyCost) {
      md += `**Costo giornaliero:** ${day.dailyCost.currency || ''} ${day.dailyCost.amount || 0}\n\n`
    }

    md += '---\n\n'
  })

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `${sanitizeFilename(trip.title || 'viaggio')}.md`)
}

// --- Utility ---

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-àèéìòù]/g, '_').slice(0, 50)
}

function escapeICal(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function getActivityIconMd(type) {
  const icons = {
    attraction: '🏛️',
    restaurant: '🍽️',
    transport: '🚗',
    activity: '🎯',
    accommodation: '🏨',
  }
  return icons[type] || '📍'
}
