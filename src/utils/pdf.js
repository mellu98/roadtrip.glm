export async function generatePDF(itinerary) {
  const html2pdf = (await import('html2pdf.js')).default

  const element = buildPDFContent(itinerary)

  const opt = {
    margin: [0, 0, 0, 0],
    filename: `${itinerary.title || 'itinerario'}.pdf`.replace(/[^a-zA-Z0-9_\-àèéìòù]/g, '_'),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  }

  await html2pdf().set(opt).from(element).save()
}

function getActivityIcon(type) {
  const icons = {
    attraction: '🏛️',
    restaurant: '🍽️',
    transport: '🚗',
    activity: '🎯',
    accommodation: '🏨',
  }
  return icons[type] || '📍'
}

function formatPrice(price) {
  if (!price) return ''
  if (price.type === 'free') return 'Gratis'
  const amt = price.amount ? `${price.currency || ''} ${price.amount}` : ''
  const suffix = price.type === 'per person' ? '/pers' : ''
  return amt + suffix
}

function getWeatherInfo(weatherForecasts, date) {
  if (!weatherForecasts || !date) return null
  const forecast = weatherForecasts.find(f => f.date === date)
  if (!forecast) return null
  const WMO_CODES = {
    0: { emoji: '☀️', desc: 'Sereno' },
    1: { emoji: '🌤️', desc: 'Preval. sereno' },
    2: { emoji: '⛅', desc: 'Parz. nuvoloso' },
    3: { emoji: '☁️', desc: 'Coperto' },
    45: { emoji: '🌫️', desc: 'Nebbia' },
    48: { emoji: '🌫️', desc: 'Nebbia brina' },
    51: { emoji: '🌧️', desc: 'Pioviggine l.' },
    53: { emoji: '🌧️', desc: 'Pioviggine m.' },
    55: { emoji: '🌧️', desc: 'Pioviggine i.' },
    61: { emoji: '🌧️', desc: 'Pioggia leggera' },
    63: { emoji: '🌧️', desc: 'Pioggia moderata' },
    65: { emoji: '🌧️', desc: 'Pioggia intensa' },
    71: { emoji: '🌨️', desc: 'Neve leggera' },
    73: { emoji: '🌨️', desc: 'Neve moderata' },
    75: { emoji: '❄️', desc: 'Neve intensa' },
    80: { emoji: '🌦️', desc: 'Rovesci leggeri' },
    81: { emoji: '🌦️', desc: 'Rovesci moderati' },
    82: { emoji: '⛈️', desc: 'Rovesci violenti' },
    95: { emoji: '⛈️', desc: 'Temporale' },
  }
  const info = WMO_CODES[forecast.weatherCode] || { emoji: '🌡️', desc: 'N/D' }
  return {
    emoji: info.emoji,
    desc: info.desc,
    tempMax: forecast.tempMax != null ? Math.round(forecast.tempMax) : null,
    tempMin: forecast.tempMin != null ? Math.round(forecast.tempMin) : null,
    precipitation: forecast.precipitation ?? 0,
    windSpeed: forecast.windSpeed ?? 0,
  }
}

function buildPDFContent(itinerary) {
  const container = document.createElement('div')
  container.style.cssText = `
    font-family: 'Inter', Arial, sans-serif;
    color: #1a1a2e;
    max-width: 100%;
    line-height: 1.5;
  `

  const colors = {
    primary: '#1a1a2e',
    accent: '#e07a5f',
    accentDark: '#c4623f',
    gold: '#f2cc8f',
    green: '#81b29a',
    blue: '#3d85c6',
    textSecondary: '#636e72',
    textLight: '#b2bec3',
    border: '#eee8e2',
    bgWarm: '#faf8f5',
    bgCard: '#f8f6f3',
  }

  const today = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  const days = itinerary.days || []
  const weatherForecasts = itinerary.weatherForecasts || null
  const expenses = itinerary._expenses || null
  const startDate = days[0]?.date || ''
  const endDate = days[days.length - 1]?.date || ''

  // ============ COVER PAGE ============
  container.innerHTML = `
    <div style="
      min-height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 60px 40px;
      background: linear-gradient(180deg, #faf8f5 0%, #f0e9e0 100%);
      page-break-after: always;
    ">
      <!-- Branding -->
      <div style="
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 3px;
        text-transform: uppercase;
        color: ${colors.accent};
        margin-bottom: 40px;
      ">🗺️ ROADTRIP PLANNER</div>

      <!-- Decorative line -->
      <div style="
        width: 60px;
        height: 3px;
        background: ${colors.accent};
        border-radius: 2px;
        margin-bottom: 40px;
      "></div>

      <!-- Trip Title -->
      <h1 style="
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 42px;
        color: ${colors.primary};
        margin: 0 0 16px 0;
        line-height: 1.2;
      ">${itinerary.title || 'Il Tuo Viaggio'}</h1>

      <!-- Destination & Date Range -->
      <p style="
        font-size: 16px;
        color: ${colors.textSecondary};
        margin: 0 0 8px 0;
      ">${itinerary.destination || ''}</p>

      <p style="
        font-size: 14px;
        color: ${colors.textLight};
        margin: 0 0 32px 0;
      ">${startDate}${startDate && endDate ? ' — ' : ''}${endDate}</p>

      <!-- Decorative line -->
      <div style="
        width: 40px;
        height: 2px;
        background: ${colors.border};
        border-radius: 1px;
        margin-bottom: 32px;
      "></div>

      <!-- Total Cost -->
      ${itinerary.totalEstimatedCost ? `
        <div style="
          display: inline-block;
          background: ${colors.primary};
          color: white;
          padding: 12px 28px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 40px;
        ">
          ${itinerary.totalEstimatedCost.currency} ${itinerary.totalEstimatedCost.amount?.toLocaleString()}
        </div>
      ` : ''}

      <!-- Generated date -->
      <p style="
        font-size: 11px;
        color: ${colors.textLight};
        margin-top: auto;
        padding-top: 40px;
      ">Generato da RoadTrip Planner — ${today}</p>
    </div>
  `

  // ============ SUMMARY PAGE ============
  let summaryHtml = `
    <div style="
      padding: 40px 40px 20px 40px;
      page-break-after: always;
    ">
      <!-- Section title -->
      <div style="
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: ${colors.accent};
        margin-bottom: 24px;
      ">📋 SOMMARIO</div>

      <h2 style="
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 28px;
        color: ${colors.primary};
        margin: 0 0 20px 0;
      ">${itinerary.title || 'Il Tuo Viaggio'}</h2>
  `

  // Trip summary text
  if (itinerary.summary) {
    summaryHtml += `
      <p style="
        font-size: 14px;
        color: ${colors.textSecondary};
        line-height: 1.7;
        margin: 0 0 24px 0;
        font-style: italic;
      ">${itinerary.summary}</p>
    `
  }

  // Table of Contents
  summaryHtml += `
    <div style="
      background: ${colors.bgCard};
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 28px;
    ">
      <h3 style="
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 16px;
        color: ${colors.primary};
        margin: 0 0 14px 0;
      ">Indice Giorni</h3>
      <table style="width: 100%; border-collapse: collapse;">
  `

  days.forEach((day, i) => {
    const weather = getWeatherInfo(weatherForecasts, day.date)
    const weatherBadge = weather
      ? `<span style="font-size: 12px; color: ${colors.textLight};">${weather.emoji} ${weather.tempMax != null ? weather.tempMax + '°' : ''}</span>`
      : ''

    summaryHtml += `
      <tr style="border-bottom: 1px solid ${colors.border};">
        <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: ${colors.accent}; width: 30px;">${i + 1}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: ${colors.primary};">${day.theme || 'Giorno ' + (i + 1)}</td>
        <td style="padding: 8px 0; font-size: 12px; color: ${colors.textSecondary}; text-align: right;">${day.date || ''}</td>
        <td style="padding: 8px 0; text-align: right; width: 80px;">${weatherBadge}</td>
      </tr>
    `
  })

  summaryHtml += `</table></div>`

  // Weather Forecast per day (if available)
  if (weatherForecasts && weatherForecasts.length > 0) {
    summaryHtml += `
      <div style="
        background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 28px;
        border: 1px solid rgba(61, 133, 198, 0.1);
      ">
        <h3 style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 16px;
          color: ${colors.primary};
          margin: 0 0 14px 0;
        ">🌤️ Previsioni Meteo</h3>
        <table style="width: 100%; border-collapse: collapse;">
    `

    days.forEach(day => {
      const w = getWeatherInfo(weatherForecasts, day.date)
      if (!w) return
      summaryHtml += `
        <tr style="border-bottom: 1px solid rgba(61,133,198,0.1);">
          <td style="padding: 6px 0; font-size: 13px; color: ${colors.textSecondary};">${day.date || ''}</td>
          <td style="padding: 6px 8px; font-size: 14px;">${w.emoji}</td>
          <td style="padding: 6px 0; font-size: 13px; color: ${colors.primary};">${w.desc}</td>
          <td style="padding: 6px 0; font-size: 13px; text-align: right; color: ${colors.accent}; font-weight: 600;">${w.tempMax != null ? w.tempMax + '°' : ''}</td>
          <td style="padding: 6px 0; font-size: 13px; text-align: right; color: ${colors.textLight};">${w.tempMin != null ? w.tempMin + '°' : ''}</td>
        </tr>
      `
    })

    summaryHtml += `</table></div>`
  }

  // Footer on summary page
  summaryHtml += `
    <div style="
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid ${colors.border};
      font-size: 10px;
      color: ${colors.textLight};
    ">Generato da RoadTrip Planner — ${today}</div>
    </div>
  `

  container.innerHTML += summaryHtml

  // ============ DAY PAGES ============
  days.forEach((day, dayIdx) => {
    const weather = getWeatherInfo(weatherForecasts, day.date)
    const isLast = dayIdx === days.length - 1 && !itinerary.packingList?.length && !itinerary.tips?.length && !expenses

    let dayHtml = `
      <div style="
        padding: 40px;
        ${!isLast ? 'page-break-after: always;' : ''}
      ">
        <!-- Day Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        ">
          <div>
            <div style="
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 2px;
              text-transform: uppercase;
              color: ${colors.accent};
              margin-bottom: 8px;
            ">GIORNO ${day.dayNumber || dayIdx + 1}</div>
            <h2 style="
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 26px;
              color: ${colors.primary};
              margin: 0 0 6px 0;
            ">${day.theme || 'Giorno ' + (dayIdx + 1)}</h2>
            <span style="font-size: 13px; color: ${colors.textSecondary};">${day.date || ''}</span>
          </div>
          ${weather ? `
            <div style="
              background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
              border-radius: 12px;
              padding: 10px 16px;
              text-align: center;
              border: 1px solid rgba(61,133,198,0.1);
              min-width: 80px;
            ">
              <span style="font-size: 24px;">${weather.emoji}</span>
              <div style="font-size: 14px; font-weight: 700; color: ${colors.accent}; margin-top: 2px;">${weather.tempMax != null ? weather.tempMax + '°' : ''}</div>
              <div style="font-size: 10px; color: ${colors.textLight};">${weather.desc}</div>
            </div>
          ` : ''}
        </div>

        <!-- Overview -->
        ${day.overview ? `
          <p style="
            font-size: 13px;
            color: ${colors.textSecondary};
            line-height: 1.7;
            margin: 0 0 20px 0;
            font-style: italic;
            padding-left: 16px;
            border-left: 3px solid ${colors.accent};
          ">${day.overview}</p>
        ` : ''}

        <!-- Activity Table -->
        <table style="
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        ">
          <thead>
            <tr style="border-bottom: 2px solid ${colors.accent};">
              <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600; width: 55px;">Ora</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600; width: 30px;"></th>
              <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600;">Attività</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600; width: 60px;">Durata</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600; width: 70px;">Prezzo</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600; width: 50px;">Voto</th>
            </tr>
          </thead>
          <tbody>
    `

    day.activities?.forEach(act => {
      const icon = getActivityIcon(act.type)
      const priceStr = formatPrice(act.price)
      const ratingStr = act.rating ? `${act.rating}/5` : ''

      dayHtml += `
        <tr style="border-bottom: 1px solid ${colors.border};">
          <td style="padding: 10px 12px; font-size: 13px; color: ${colors.accent}; font-weight: 600; vertical-align: top;">${act.time || ''}</td>
          <td style="padding: 10px 12px; font-size: 16px; vertical-align: top;">${icon}</td>
          <td style="padding: 10px 12px; vertical-align: top;">
            <strong style="font-size: 13px; color: ${colors.primary};">${act.name || ''}</strong>
            ${act.description ? `<br><span style="font-size: 11px; color: ${colors.textSecondary}; line-height: 1.5;">${act.description.length > 100 ? act.description.slice(0, 100) + '...' : act.description}</span>` : ''}
            ${act.location?.address ? `<br><span style="font-size: 10px; color: ${colors.textLight};">📍 ${act.location.address}</span>` : ''}
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: ${colors.textSecondary}; vertical-align: top;">${act.duration || ''}</td>
          <td style="padding: 10px 12px; font-size: 12px; color: ${colors.textSecondary}; text-align: right; vertical-align: top;">${priceStr}</td>
          <td style="padding: 10px 12px; font-size: 12px; color: ${colors.gold}; text-align: center; vertical-align: top; font-weight: 600;">${ratingStr}</td>
        </tr>
      `
    })

    dayHtml += `
          </tbody>
        </table>

        <!-- Daily Cost Summary -->
        ${day.dailyCost ? `
          <div style="
            text-align: right;
            padding: 10px 0;
            border-top: 1px solid ${colors.border};
          ">
            <span style="font-size: 12px; color: ${colors.textSecondary};">Costo giornaliero stimato: </span>
            <span style="font-size: 14px; font-weight: 700; color: ${colors.accent};">${day.dailyCost.currency || ''} ${day.dailyCost.amount || 0}</span>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid ${colors.border};
          font-size: 10px;
          color: ${colors.textLight};
        ">Generato da RoadTrip Planner — ${today}</div>
      </div>
    `

    container.innerHTML += dayHtml
  })

  // ============ PACKING LIST SECTION ============
  if (itinerary.packingList?.length) {
    // Check if packing items have categories
    const hasCategories = itinerary.packingList.some(p => p.category)
    let packingHtml = `
      <div style="padding: 40px; page-break-after: always;">
        <div style="
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${colors.accent};
          margin-bottom: 24px;
        ">🎒 PACKING LIST</div>

        <h2 style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          color: ${colors.primary};
          margin: 0 0 20px 0;
        ">Cosa Portare</h2>
    `

    if (hasCategories) {
      // Group by category
      const groups = {}
      itinerary.packingList.forEach(p => {
        const cat = p.category || 'Altro'
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(p.item || p.name || p)
      })

      Object.entries(groups).forEach(([category, items]) => {
        packingHtml += `
          <div style="margin-bottom: 16px;">
            <h4 style="font-size: 13px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0;">${category}</h4>
            <div style="columns: 2; column-gap: 24px;">
        `
        items.forEach(item => {
          const itemName = typeof item === 'string' ? item : (item.item || item.name || '')
          packingHtml += `<div style="font-size: 13px; color: ${colors.primary}; margin-bottom: 4px; break-inside: avoid;">☐ ${itemName}</div>`
        })
        packingHtml += `</div></div>`
      })
    } else {
      // Flat list with checkbox style
      packingHtml += `<div style="columns: 2; column-gap: 24px;">`
      itinerary.packingList.forEach(p => {
        const itemName = typeof p === 'string' ? p : (p.item || p.name || p)
        packingHtml += `<div style="font-size: 13px; color: ${colors.primary}; margin-bottom: 4px; break-inside: avoid;">☐ ${itemName}</div>`
      })
      packingHtml += `</div>`
    }

    packingHtml += `
        <div style="
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid ${colors.border};
          font-size: 10px;
          color: ${colors.textLight};
        ">Generato da RoadTrip Planner — ${today}</div>
      </div>
    `

    container.innerHTML += packingHtml
  }

  // ============ BUDGET SECTION ============
  if (expenses && expenses.length > 0) {
    // Aggregate by category
    const categoryMap = {}
    expenses.forEach(exp => {
      const cat = exp.category || 'Altro'
      if (!categoryMap[cat]) {
        categoryMap[cat] = { estimated: 0, actual: 0 }
      }
      if (exp.amount) {
        categoryMap[cat].actual += parseFloat(exp.amount) || 0
      }
    })

    // Try to get estimated from daily costs
    if (itinerary.totalEstimatedCost) {
      categoryMap['Totale stimato'] = {
        estimated: itinerary.totalEstimatedCost.amount || 0,
        actual: Object.values(categoryMap).reduce((sum, c) => sum + c.actual, 0),
      }
    }

    let budgetHtml = `
      <div style="padding: 40px; page-break-after: always;">
        <div style="
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${colors.accent};
          margin-bottom: 24px;
        ">💰 BUDGET</div>

        <h2 style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          color: ${colors.primary};
          margin: 0 0 20px 0;
        ">Riepilogo Budget</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid ${colors.accent};">
              <th style="padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600;">Categoria</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600;">Stimato</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600;">Reale</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${colors.textLight}; font-weight: 600;">Differenza</th>
            </tr>
          </thead>
          <tbody>
    `

    const currency = itinerary.formData?.currency || itinerary.totalEstimatedCost?.currency || '€'

    Object.entries(categoryMap).forEach(([category, data]) => {
      const diff = data.estimated - data.actual
      const diffColor = diff >= 0 ? colors.green : '#e74c3c'
      const diffSign = diff >= 0 ? '+' : ''

      budgetHtml += `
        <tr style="border-bottom: 1px solid ${colors.border};">
          <td style="padding: 10px 12px; font-size: 13px; color: ${colors.primary}; font-weight: 500;">${category}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: ${colors.textSecondary}; text-align: right;">${currency} ${data.estimated.toLocaleString()}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: ${colors.primary}; text-align: right; font-weight: 600;">${currency} ${data.actual.toLocaleString()}</td>
          <td style="padding: 10px 12px; font-size: 13px; color: ${diffColor}; text-align: right; font-weight: 600;">${diffSign}${currency} ${Math.abs(diff).toLocaleString()}</td>
        </tr>
      `
    })

    budgetHtml += `
          </tbody>
        </table>

        <div style="
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid ${colors.border};
          font-size: 10px;
          color: ${colors.textLight};
        ">Generato da RoadTrip Planner — ${today}</div>
      </div>
    `

    container.innerHTML += budgetHtml
  }

  // ============ TIPS SECTION ============
  if (itinerary.tips?.length) {
    let tipsHtml = `
      <div style="padding: 40px;">
        <div style="
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: ${colors.accent};
          margin-bottom: 24px;
        ">💡 CONSIGLI</div>

        <h2 style="
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 26px;
          color: ${colors.primary};
          margin: 0 0 20px 0;
        ">Consigli di Viaggio</h2>

        <div style="
          background: ${colors.bgCard};
          border-radius: 12px;
          padding: 20px 24px;
        ">
    `

    itinerary.tips.forEach((tip, i) => {
      tipsHtml += `
        <div style="
          display: flex;
          gap: 12px;
          margin-bottom: ${i < itinerary.tips.length - 1 ? '12px' : '0'};
          ${i < itinerary.tips.length - 1 ? `border-bottom: 1px solid ${colors.border}; padding-bottom: 12px;` : ''}
        ">
          <span style="font-size: 14px; color: ${colors.accent}; font-weight: 700; flex-shrink: 0;">${i + 1}.</span>
          <span style="font-size: 13px; color: ${colors.primary}; line-height: 1.6;">${tip}</span>
        </div>
      `
    })

    tipsHtml += `
        </div>

        <div style="
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid ${colors.border};
          font-size: 10px;
          color: ${colors.textLight};
        ">Generato da RoadTrip Planner — ${today}</div>
      </div>
    `

    container.innerHTML += tipsHtml
  }

  return container
}
