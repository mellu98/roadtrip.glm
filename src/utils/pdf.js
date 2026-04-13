export async function generatePDF(itinerary) {
  const html2pdf = (await import('html2pdf.js')).default

  const element = buildPDFContent(itinerary)

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${itinerary.title || 'itinerario'}.pdf`.replace(/[^a-zA-Z0-9_\-àèéìòù]/g, '_'),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  }

  await html2pdf().set(opt).from(element).save()
}

function buildPDFContent(itinerary) {
  const container = document.createElement('div')
  container.style.cssText = 'font-family: Inter, Arial, sans-serif; color: #1a1a2e; padding: 20px; max-width: 100%;'

  // Header
  container.innerHTML = `
    <div style="text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #e07a5f;">
      <h1 style="font-family: Playfair Display, serif; font-size:28px; color:#1a1a2e; margin:0 0 8px 0;">
        ${itinerary.title || 'Il Tuo Viaggio'}
      </h1>
      <p style="color:#636e72; font-size:14px; margin:0;">
        ${itinerary.days?.[0]?.date || ''} — ${itinerary.days?.[itinerary.days.length - 1]?.date || ''}
        ${itinerary.totalEstimatedCost ? ` &bull; ${itinerary.totalEstimatedCost.currency} ${itinerary.totalEstimatedCost.amount}` : ''}
      </p>
      ${itinerary.summary ? `<p style="color:#636e72; font-size:13px; margin:12px 0 0 0; font-style:italic;">${itinerary.summary}</p>` : ''}
    </div>
  `

  // Tips
  if (itinerary.tips?.length) {
    const tipsHtml = itinerary.tips.map(t => `<li style="margin-bottom:4px; font-size:12px;">${t}</li>`).join('')
    container.innerHTML += `
      <div style="background:#f8f6f3; padding:15px; border-radius:8px; margin-bottom:20px;">
        <h3 style="font-family: Playfair Display, serif; margin:0 0 8px 0; font-size:16px;">💡 Consigli di Viaggio</h3>
        <ul style="margin:0; padding-left:20px; color:#3d405b;">${tipsHtml}</ul>
      </div>
    `
  }

  // Days
  itinerary.days?.forEach(day => {
    const activitiesHtml = day.activities?.map(act => {
      const icon = getActivityIcon(act.type)
      const priceStr = act.price?.type === 'free' ? 'Gratis' :
        act.price?.amount ? `${act.price.currency || ''} ${act.price.amount}${act.price.type === 'per person' ? '/persona' : ''}` : ''

      return `
        <tr>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; vertical-align:top; width:60px; font-size:13px; color:#e07a5f; font-weight:600;">
            ${act.time || ''}
          </td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; vertical-align:top; width:30px; font-size:16px;">
            ${icon}
          </td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; vertical-align:top;">
            <strong style="font-size:13px;">${act.name || ''}</strong>
            <span style="color:#636e72; font-size:11px;">${act.duration ? ` &bull; ${act.duration}` : ''}${priceStr ? ` &bull; ${priceStr}` : ''}</span>
            ${act.description ? `<br><span style="color:#636e72; font-size:11px;">${act.description}</span>` : ''}
            ${act.location?.address ? `<br><span style="color:#b2bec3; font-size:10px;">📍 ${act.location.address}</span>` : ''}
          </td>
          <td style="padding:8px 12px; border-bottom:1px solid #eee; vertical-align:top; text-align:right; font-size:12px; color:#636e72;">
            ${act.hours || ''}
          </td>
        </tr>
      `
    }).join('') || ''

    container.innerHTML += `
      <div style="margin-bottom:20px; page-break-inside:avoid;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-left:4px solid #e07a5f; padding-left:12px;">
          <div>
            <h2 style="font-family: Playfair Display, serif; margin:0; font-size:18px;">
              Giorno ${day.dayNumber}
            </h2>
            <span style="color:#636e72; font-size:12px;">${day.theme || ''}</span>
          </div>
          <span style="color:#636e72; font-size:12px;">${day.date || ''}</span>
        </div>
        ${day.overview ? `<p style="font-size:12px; color:#636e72; margin:0 0 10px 16px; font-style:italic;">${day.overview}</p>` : ''}
        <table style="width:100%; border-collapse:collapse;">
          ${activitiesHtml}
        </table>
        ${day.dailyCost ? `<p style="text-align:right; font-size:12px; color:#e07a5f; margin:8px 0 0 0;">Costo giornaliero stimato: ${day.dailyCost.currency || ''} ${day.dailyCost.amount || 0}</p>` : ''}
      </div>
    `
  })

  // Packing list
  if (itinerary.packingList?.length) {
    const packHtml = itinerary.packingList.map(p => `<li style="margin-bottom:3px; font-size:12px;">${p}</li>`).join('')
    container.innerHTML += `
      <div style="background:#f8f6f3; padding:15px; border-radius:8px; margin-top:20px; page-break-inside:avoid;">
        <h3 style="font-family: Playfair Display, serif; margin:0 0 8px 0; font-size:16px;">🎒 Cosa Portare</h3>
        <ul style="margin:0; padding-left:20px; color:#3d405b; columns:2;">${packHtml}</ul>
      </div>
    `
  }

  return container
}

function getActivityIcon(type) {
  const icons = {
    attraction: '🏛️',
    restaurant: '🍽️',
    transport: '🚗',
    activity: '🎯',
    accommodation: '🏨'
  }
  return icons[type] || '📍'
}
