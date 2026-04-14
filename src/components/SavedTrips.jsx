import { useRef } from 'react'
import { useTripStore } from '../store/tripStore'
import { useUiStore, VIEWS } from '../store/uiStore'
import { importJSON } from '../utils/export'
import { useTranslation } from '../i18n'

const EMOJIS = ['🇮🇹', '🇪🇸', '🇫🇷', '🇯🇵', '🇬🇧', '🇩🇪', '🇺🇸', '🇧🇷', '🇦🇷', '🇲🇽', '🇬🇷', '🇵🇹', '🇹🇭', '🇲🇦', '🇭🇷', '🌍']

function getTripEmoji(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return EMOJIS[hash % EMOJIS.length]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function daysBetween(start, end) {
  if (!start || !end) return null
  const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : null
}

export default function SavedTrips({ onNewTrip }) {
  const { trips, deleteTrip, loadTrip, saveTrip } = useTripStore()
  const { setView } = useUiStore()
  const fileInputRef = useRef(null)
  const { lang, setLang } = useTranslation()

  const handleLoadTrip = (trip) => {
    loadTrip(trip)
    setView(VIEWS.ITINERARY)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const trip = await importJSON(file)
      trip.id = useTripStore.getState().generateId()
      trip.createdAt = new Date().toISOString()
      saveTrip(trip)
    } catch (err) {
      alert('Errore nell\'importazione: ' + err.message)
    }
    // Reset file input
    e.target.value = ''
  }

  return (
    <div className="saved-trips">
      <div className="home-header">
        <div className="home-brand">
          <span className="home-logo">🗺️</span>
          <div>
            <h1>RoadTrip Planner</h1>
            <p className="home-tagline">Il tuo viaggio perfetto, pianificato dall'IA</p>
          </div>
        </div>
        <button className="lang-toggle" onClick={() => setLang(lang === 'it' ? 'en' : 'it')}>
          {lang === 'it' ? '🇬🇧 EN' : '🇮🇹 IT'}
        </button>
      </div>

      <button className="btn-new-trip" onClick={onNewTrip}>
        <i className="fas fa-plus"></i>
        <span>Nuovo Viaggio</span>
      </button>

      {trips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✈️</div>
          <h2>Nessun viaggio salvato</h2>
          <p>Crea il tuo primo itinerario e lo troverai qui</p>
          <button className="btn-primary" onClick={onNewTrip}>
            <i className="fas fa-plus"></i> Crea il primo viaggio
          </button>
        </div>
      ) : (
        <div className="trips-grid">
          {trips.map(trip => (
            <div key={trip.id} className="trip-card">
              <div className="trip-card-header">
                <span className="trip-card-emoji">{getTripEmoji(trip.destination || trip.title || '')}</span>
                <button
                  className="btn-icon-sm btn-danger"
                  onClick={() => {
                    if (window.confirm(`Eliminare "${trip.title || trip.destination}"?`)) {
                      deleteTrip(trip.id)
                    }
                  }}
                  title="Elimina"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <div className="trip-card-body">
                <h3>{trip.title || trip.destination || 'Viaggio senza nome'}</h3>
                {trip.destination && trip.title && trip.title !== trip.destination && (
                  <p className="trip-card-dest">{trip.destination}</p>
                )}
                {(trip.startDate || trip.endDate) && (
                  <p className="trip-card-dates">
                    <i className="fas fa-calendar-alt"></i>
                    {formatDate(trip.startDate)}
                    {trip.startDate && trip.endDate && ' → '}
                    {formatDate(trip.endDate)}
                    {daysBetween(trip.startDate, trip.endDate) && (
                      <span className="trip-card-days"> ({daysBetween(trip.startDate, trip.endDate)} gg)</span>
                    )}
                  </p>
                )}
                {trip.formData?.budget && (
                  <p className="trip-card-budget">
                    <i className="fas fa-wallet"></i>
                    {trip.formData.currency || 'EUR'} {trip.formData.budget?.toLocaleString()}
                  </p>
                )}
                {trip.totalEstimatedCost && (
                  <p className="trip-card-cost">
                    <i className="fas fa-receipt"></i>
                    Stimato: {trip.totalEstimatedCost.currency} {trip.totalEstimatedCost.amount?.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="trip-card-footer">
                <button className="btn-primary btn-sm" onClick={() => handleLoadTrip(trip)}>
                  <i className="fas fa-eye"></i> Apri
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <button className="import-btn" onClick={() => fileInputRef.current?.click()}>
        <i className="fas fa-file-import"></i> Importa viaggio
      </button>
    </div>
  )
}
