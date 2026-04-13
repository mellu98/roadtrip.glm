import { useState, useEffect, useCallback } from 'react'
import ApiKeySetup from './components/ApiKeySetup'
import TripForm from './components/TripForm'
import LoadingScreen from './components/LoadingScreen'
import Itinerary from './components/Itinerary'
import SavedTrips from './components/SavedTrips'
import { getTrips, saveTrip, deleteTrip, getCurrentTrip, setCurrentTrip, getApiConfig, saveApiConfig, hasApiConfig, generateTripId } from './utils/storage'
import { generateItinerary } from './utils/ai'

const VIEWS = {
  HOME: 'home',
  FORM: 'form',
  LOADING: 'loading',
  ITINERARY: 'itinerary',
}

export default function App() {
  const [view, setView] = useState(VIEWS.HOME)
  const [trips, setTrips] = useState([])
  const [currentItinerary, setCurrentItinerary] = useState(null)
  const [error, setError] = useState(null)
  const [showApiSetup, setShowApiSetup] = useState(false)
  const [savedCurrentTrip, setSavedCurrentTrip] = useState(false)

  useEffect(() => {
    setTrips(getTrips())
    const saved = getCurrentTrip()
    if (saved?.itinerary) {
      setCurrentItinerary(saved)
      setSavedCurrentTrip(true)
      setView(VIEWS.ITINERARY)
    }
  }, [])

  const handleNewTrip = useCallback(() => {
    if (!hasApiConfig()) {
      setShowApiSetup(true)
      return
    }
    setError(null)
    setView(VIEWS.FORM)
  }, [])

  const handleApiSave = useCallback((config) => {
    saveApiConfig(config)
    setShowApiSetup(false)
  }, [])

  const handleGenerate = useCallback(async (formData) => {
    setError(null)
    setView(VIEWS.LOADING)

    try {
      const itinerary = await generateItinerary(formData)
      const trip = {
        id: generateTripId(),
        title: itinerary.title,
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        formData,
        ...itinerary,
        createdAt: new Date().toISOString(),
      }

      setCurrentItinerary(trip)
      setCurrentTrip(trip)
      setSavedCurrentTrip(false)
      setView(VIEWS.ITINERARY)
    } catch (err) {
      setError(err.message)
      setView(VIEWS.FORM)
    }
  }, [])

  const handleSaveTrip = useCallback((trip) => {
    saveTrip(trip)
    setTrips(getTrips())
    setSavedCurrentTrip(true)
  }, [])

  const handleLoadTrip = useCallback((trip) => {
    setCurrentItinerary(trip)
    setCurrentTrip(trip)
    setSavedCurrentTrip(!!trips.find(t => t.id === trip.id))
    setView(VIEWS.ITINERARY)
  }, [trips])

  const handleDeleteTrip = useCallback((id) => {
    deleteTrip(id)
    setTrips(getTrips())
  }, [])

  const handleBack = useCallback(() => {
    setCurrentItinerary(null)
    setCurrentTrip(null)
    setSavedCurrentTrip(false)
    setError(null)
    setView(VIEWS.HOME)
  }, [])

  const openApiSetupFromItinerary = useCallback(() => {
    setShowApiSetup(true)
  }, [])

  return (
    <div className="app">
      {view === VIEWS.HOME && (
        <SavedTrips
          trips={trips}
          onLoad={handleLoadTrip}
          onDelete={handleDeleteTrip}
          onNewTrip={handleNewTrip}
        />
      )}

      {view === VIEWS.FORM && (
        <TripForm
          onGenerate={handleGenerate}
          onBack={handleBack}
        />
      )}

      {view === VIEWS.LOADING && (
        <LoadingScreen destination={currentItinerary?.destination} />
      )}

      {view === VIEWS.ITINERARY && currentItinerary && (
        <Itinerary
          itinerary={currentItinerary}
          onSave={handleSaveTrip}
          onBack={handleBack}
          isSaved={savedCurrentTrip}
        />
      )}

      {showApiSetup && (
        <ApiKeySetup
          onSave={handleApiSave}
          currentConfig={getApiConfig()}
        />
      )}

      {error && (
        <div className="error-toast">
          <div className="error-toast-content">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Errore</strong>
              <p>{error}</p>
            </div>
            <button className="btn-icon" onClick={() => setError(null)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="error-toast-actions">
            <button className="btn-secondary btn-sm" onClick={() => setError(null)}>Chiudi</button>
            <button className="btn-primary btn-sm" onClick={() => setShowApiSetup(true)}>
              <i className="fas fa-cog"></i> Impostazioni API
            </button>
          </div>
        </div>
      )}

      {/* Floating API settings button on home */}
      {view === VIEWS.HOME && !showApiSetup && (
        <button
          className="fab-settings"
          onClick={() => setShowApiSetup(true)}
          title="Impostazioni API"
        >
          <i className="fas fa-cog"></i>
        </button>
      )}
    </div>
  )
}
