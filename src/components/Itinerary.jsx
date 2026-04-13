import { useState, useRef } from 'react'
import { openInMaps, openDirections, formatAddress } from '../utils/maps'
import { generatePDF } from '../utils/pdf'

const TYPE_CONFIG = {
  attraction: { icon: '🏛️', color: '#3d85c6', label: 'Attrazione' },
  restaurant: { icon: '🍽️', color: '#e07a5f', label: 'Ristorante' },
  transport: { icon: '🚗', color: '#636e72', label: 'Trasporto' },
  activity: { icon: '🎯', color: '#81b29a', label: 'Attività' },
  accommodation: { icon: '🏨', color: '#6c5ce7', label: 'Alloggio' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity
}

function formatPrice(price) {
  if (!price) return ''
  if (price.type === 'free') return 'Gratis'
  const amt = price.amount ? `${price.currency || ''} ${price.amount}` : ''
  const suffix = price.type === 'per person' ? '/persona' : ''
  return amt + suffix
}

function formatRating(rating) {
  if (!rating) return null
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.3 && rating % 1 < 0.8
  const stars = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0))
  return stars
}

export default function Itinerary({ itinerary, onSave, onBack, isSaved }) {
  const [activeDay, setActiveDay] = useState(0)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const contentRef = useRef(null)

  const days = itinerary?.days || []
  const currentDay = days[activeDay]
  const totalCost = itinerary?.totalEstimatedCost

  const handleSave = () => {
    setSaving(true)
    onSave(itinerary)
    setTimeout(() => setSaving(false), 800)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await generatePDF(itinerary)
    } catch (err) {
      alert('Errore nella generazione PDF: ' + err.message)
    }
    setExporting(false)
  }

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity)
    setMobileDetailOpen(true)
  }

  const closeMobileDetail = () => {
    setMobileDetailOpen(false)
    setSelectedActivity(null)
  }

  const budgetPercent = totalCost?.amount && itinerary?.formData?.budget
    ? Math.min((totalCost.amount / itinerary.formData.budget) * 100, 100)
    : null

  const budgetOver = budgetPercent !== null && budgetPercent > 100

  return (
    <div className="itinerary-container">
      {/* Top Bar */}
      <div className="itinerary-topbar">
        <button className="btn-icon" onClick={onBack} title="Torna ai viaggi">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="itinerary-title-group">
          <h1 className="itinerary-title">{itinerary.title || 'Il Tuo Viaggio'}</h1>
          {itinerary.summary && <p className="itinerary-summary">{itinerary.summary}</p>}
        </div>
        <div className="itinerary-actions">
          <button
            className={`btn-icon ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            title={isSaved ? 'Salvato' : 'Salva viaggio'}
            disabled={saving}
          >
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : isSaved ? 'fa-bookmark' : 'fa-regular fa-bookmark'}`}></i>
          </button>
          <button className="btn-icon" onClick={handleExport} title="Scarica PDF" disabled={exporting}>
            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
          </button>
          <button className="btn-icon" onClick={() => handleActivityClick(null)} title="Informazioni viaggio">
            <i className="fas fa-info-circle"></i>
          </button>
        </div>
      </div>

      {/* Budget Bar */}
      {budgetPercent !== null && (
        <div className="budget-bar-container">
          <div className="budget-bar-labels">
            <span>Spesa stimata: {totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
            <span>Budget: {itinerary.formData.currency} {itinerary.formData.budget?.toLocaleString()}</span>
          </div>
          <div className="budget-bar">
            <div
              className={`budget-bar-fill ${budgetOver ? 'over' : ''}`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {budgetOver && <p className="budget-warning"><i className="fas fa-exclamation-triangle"></i> Supera il budget del {(budgetPercent - 100).toFixed(0)}%</p>}
        </div>
      )}

      {/* Day Tabs */}
      <div className="day-tabs">
        <div className="day-tabs-scroll">
          {days.map((day, i) => (
            <button
              key={i}
              className={`day-tab ${i === activeDay ? 'active' : ''}`}
              onClick={() => setActiveDay(i)}
            >
              <span className="day-tab-num">G{i + 1}</span>
              <span className="day-tab-theme">{day.theme || `Giorno ${i + 1}`}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Day Content */}
      <div className="itinerary-content" ref={contentRef}>
        {currentDay ? (
          <div className="day-content">
            <div className="day-header">
              <div>
                <h2>Giorno {currentDay.dayNumber}</h2>
                <p className="day-theme">{currentDay.theme}</p>
              </div>
              <div className="day-meta">
                {currentDay.date && <span><i className="fas fa-calendar"></i> {new Date(currentDay.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
                {currentDay.dailyCost && <span><i className="fas fa-receipt"></i> {currentDay.dailyCost.currency} {currentDay.dailyCost.amount}</span>}
              </div>
            </div>
            {currentDay.overview && <p className="day-overview">{currentDay.overview}</p>}

            {/* Timeline */}
            <div className="timeline">
              {currentDay.activities?.map((activity, idx) => {
                const config = getTypeConfig(activity.type)
                const isSelected = selectedActivity?.id === activity.id

                return (
                  <div key={activity.id || idx} className="timeline-item">
                    <div className="timeline-line" style={{ '--line-color': config.color }}>
                      <div className="timeline-dot" style={{ background: config.color }}>
                        <span className="timeline-dot-icon">{config.icon}</span>
                      </div>
                      {idx < currentDay.activities.length - 1 && <div className="timeline-connector" />}
                    </div>

                    <div
                      className={`activity-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleActivityClick(activity)}
                    >
                      <div className="activity-card-header">
                        <span className="activity-time">{activity.time}</span>
                        <span className="activity-type-badge" style={{ background: config.color + '18', color: config.color }}>
                          {config.icon} {config.label}
                        </span>
                      </div>
                      <h3 className="activity-name">{activity.name}</h3>
                      <div className="activity-meta">
                        {activity.duration && <span><i className="fas fa-clock"></i> {activity.duration}</span>}
                        {activity.price && <span><i className="fas fa-tag"></i> {formatPrice(activity.price)}</span>}
                        {activity.rating && <span className="activity-rating">★ {activity.rating}</span>}
                      </div>
                      {activity.cuisine && <span className="activity-cuisine"><i className="fas fa-utensils"></i> {activity.cuisine}</span>}
                      {activity.description && (
                        <p className="activity-desc">{activity.description}</p>
                      )}
                      <div className="activity-quick-actions">
                        <button
                          className="btn-map"
                          onClick={(e) => { e.stopPropagation(); openInMaps(activity.location) }}
                          title="Apri in Maps"
                        >
                          <i className="fas fa-map-marker-alt"></i> Mappa
                        </button>
                        <button
                          className="btn-directions"
                          onClick={(e) => { e.stopPropagation(); openDirections(activity.location) }}
                          title="Indicazioni"
                        >
                          <i className="fas fa-directions"></i> Indicazioni
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="empty-day">
            <p>Seleziona un giorno per vedere le attività</p>
          </div>
        )}
      </div>

      {/* Detail Panel - Desktop */}
      {selectedActivity && (
        <div className={`detail-panel ${mobileDetailOpen ? 'mobile-open' : ''}`}>
          <div className="detail-panel-header">
            <h3>{selectedActivity.name}</h3>
            <button className="btn-icon" onClick={closeMobileDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="detail-panel-body">
            {(() => {
              const config = getTypeConfig(selectedActivity.type)
              return (
                <span className="detail-type" style={{ background: config.color + '18', color: config.color }}>
                  {config.icon} {config.label}
                  {selectedActivity.mealType && ` • ${selectedActivity.mealType}`}
                </span>
              )
            })()}

            {selectedActivity.description && (
              <p className="detail-description">{selectedActivity.description}</p>
            )}

            <div className="detail-info-grid">
              {selectedActivity.time && (
                <div className="detail-info-item">
                  <i className="fas fa-clock"></i>
                  <div>
                    <span className="detail-info-label">Orario</span>
                    <span className="detail-info-value">{selectedActivity.time}{selectedActivity.duration ? ` (${selectedActivity.duration})` : ''}</span>
                  </div>
                </div>
              )}

              {selectedActivity.hours && (
                <div className="detail-info-item">
                  <i className="fas fa-store"></i>
                  <div>
                    <span className="detail-info-label">Orari di apertura</span>
                    <span className="detail-info-value">{selectedActivity.hours}</span>
                  </div>
                </div>
              )}

              {selectedActivity.price && (
                <div className="detail-info-item">
                  <i className="fas fa-tag"></i>
                  <div>
                    <span className="detail-info-label">Prezzo</span>
                    <span className="detail-info-value">{formatPrice(selectedActivity.price)}</span>
                  </div>
                </div>
              )}

              {selectedActivity.rating && (
                <div className="detail-info-item">
                  <i className="fas fa-star"></i>
                  <div>
                    <span className="detail-info-label">Valutazione</span>
                    <span className="detail-info-value">
                      {selectedActivity.rating}/5 {formatRating(selectedActivity.rating)}
                      {selectedActivity.reviews && <span className="detail-reviews">({selectedActivity.reviews?.toLocaleString()} recensioni)</span>}
                    </span>
                  </div>
                </div>
              )}

              {selectedActivity.cuisine && (
                <div className="detail-info-item">
                  <i className="fas fa-utensils"></i>
                  <div>
                    <span className="detail-info-label">Cucina</span>
                    <span className="detail-info-value">{selectedActivity.cuisine}</span>
                  </div>
                </div>
              )}

              {selectedActivity.location?.address && (
                <div className="detail-info-item">
                  <i className="fas fa-map-pin"></i>
                  <div>
                    <span className="detail-info-label">Indirizzo</span>
                    <span className="detail-info-value">{selectedActivity.location.address}</span>
                  </div>
                </div>
              )}

              {selectedActivity.phone && (
                <div className="detail-info-item">
                  <i className="fas fa-phone"></i>
                  <div>
                    <span className="detail-info-label">Telefono</span>
                    <a className="detail-info-value detail-link" href={`tel:${selectedActivity.phone}`}>{selectedActivity.phone}</a>
                  </div>
                </div>
              )}

              {selectedActivity.website && (
                <div className="detail-info-item">
                  <i className="fas fa-globe"></i>
                  <div>
                    <span className="detail-info-label">Sito web</span>
                    <a
                      className="detail-info-value detail-link"
                      href={selectedActivity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {selectedActivity.website.replace(/^https?:\/\//, '').slice(0, 30)}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {selectedActivity.tips?.length > 0 && (
              <div className="detail-tips">
                <h4><i className="fas fa-lightbulb"></i> Consigli</h4>
                <ul>
                  {selectedActivity.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="detail-actions">
              <button className="btn-primary" onClick={() => openInMaps(selectedActivity.location)}>
                <i className="fas fa-map-marker-alt"></i> Apri in Maps
              </button>
              <button className="btn-secondary" onClick={() => openDirections(selectedActivity.location)}>
                <i className="fas fa-directions"></i> Indicazioni
              </button>
              {selectedActivity.phone && (
                <a className="btn-secondary" href={`tel:${selectedActivity.phone}`}>
                  <i className="fas fa-phone"></i> Chiama
                </a>
              )}
              {selectedActivity.website && (
                <a className="btn-secondary" href={selectedActivity.website} target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-globe"></i> Sito Web
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Detail Overlay */}
      {mobileDetailOpen && <div className="detail-backdrop" onClick={closeMobileDetail} />}

      {/* Trip Info Panel (when activity is null but info button clicked) */}
      {selectedActivity === null && mobileDetailOpen && (
        <div className="detail-panel mobile-open">
          <div className="detail-panel-header">
            <h3>Informazioni Viaggio</h3>
            <button className="btn-icon" onClick={closeMobileDetail}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="detail-panel-body">
            <p className="detail-description">{itinerary.summary}</p>

            {totalCost && (
              <div className="detail-info-item">
                <i className="fas fa-receipt"></i>
                <div>
                  <span className="detail-info-label">Costo totale stimato</span>
                  <span className="detail-info-value">{totalCost.currency} {totalCost.amount?.toLocaleString()}</span>
                </div>
              </div>
            )}

            {itinerary.tips?.length > 0 && (
              <div className="detail-tips">
                <h4><i className="fas fa-lightbulb"></i> Consigli di Viaggio</h4>
                <ul>
                  {itinerary.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            )}

            {itinerary.packingList?.length > 0 && (
              <div className="detail-tips">
                <h4><i className="fas fa-suitcase"></i> Cosa Portare</h4>
                <ul>
                  {itinerary.packingList.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
