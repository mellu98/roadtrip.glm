import { useEffect, useState } from 'react'
import { useTripStore } from './store/tripStore'
import { useUiStore, VIEWS } from './store/uiStore'
import { useApiStore } from './store/apiStore'
import { isSharedTrip, decodeTripFromUrl, clearShareHash } from './utils/share'
import { isOnline, onConnectionChange } from './utils/offline'
import ApiKeySetup from './components/ApiKeySetup'
import TripForm from './components/TripForm'
import LoadingScreen from './components/LoadingScreen'
import Itinerary from './components/Itinerary'
import SavedTrips from './components/SavedTrips'
import { generateItinerary } from './utils/ai'
import { getTheme, applyTheme } from './utils/theme'

export default function App() {
  const { currentItinerary, isSaved, loadTrips, loadCurrentTrip, setItinerary, saveTrip, clearCurrent } = useTripStore()
  const { view, showApiSetup, error, theme, setView, goHome, toggleApiSetup, setError, clearError } = useUiStore()
  const { isConfigured } = useApiStore()

  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(isOnline())
    const unsub = onConnectionChange(setOnline)
    return unsub
  }, [])

  useEffect(() => {
    // Check for shared trip in URL
    if (isSharedTrip()) {
      const sharedTrip = decodeTripFromUrl()
      if (sharedTrip) {
        sharedTrip._shared = true
        setItinerary(sharedTrip)
        setView(VIEWS.ITINERARY)
        useTripStore.getState().fetchWeatherForTrip()
        clearShareHash()
        return
      }
    }

    loadTrips()
    const loaded = loadCurrentTrip()
    if (loaded) {
      setView(VIEWS.ITINERARY)
      // Fetch meteo anche per viaggi salvati
      useTripStore.getState().fetchWeatherForTrip()
    }
    // Initialize theme
    const savedTheme = getTheme()
    applyTheme(savedTheme)
  }, [])

  const handleNewTrip = () => {
    if (!isConfigured) {
      toggleApiSetup(true)
      return
    }
    setError(null)
    setView(VIEWS.FORM)
  }

  const handleGenerate = async (formData) => {
    setError(null)
    setView(VIEWS.LOADING)
    try {
      const itinerary = await generateItinerary(formData)
      const trip = {
        id: useTripStore.getState().generateId(),
        title: itinerary.title,
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        formData,
        ...itinerary,
        createdAt: new Date().toISOString(),
      }
      setItinerary(trip)
      // Fetch meteo in background (non blocca la navigazione)
      useTripStore.getState().fetchWeatherForTrip()
      setView(VIEWS.ITINERARY)
    } catch (err) {
      setError(err.message)
      setView(VIEWS.FORM)
    }
  }

  const handleBack = () => {
    clearCurrent()
    goHome()
  }

  return (
    <div className="app">
      {!online && (
        <div className="offline-banner">
          <i className="fas fa-wifi-slash"></i> Sei offline — i viaggi salvati sono ancora disponibili
        </div>
      )}
      {view === VIEWS.HOME && (
        <SavedTrips onNewTrip={handleNewTrip} />
      )}
      {view === VIEWS.FORM && (
        <TripForm onGenerate={handleGenerate} onBack={handleBack} />
      )}
      {view === VIEWS.LOADING && (
        <LoadingScreen destination={currentItinerary?.destination} />
      )}
      {view === VIEWS.ITINERARY && currentItinerary && (
        <Itinerary onBack={handleBack} />
      )}
      {showApiSetup && (
        <ApiKeySetup />
      )}
      {error && (
        <div className="error-toast">
          <div className="error-toast-content">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Errore</strong>
              <p>{error}</p>
            </div>
            <button className="btn-icon" onClick={clearError}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="error-toast-actions">
            <button className="btn-secondary btn-sm" onClick={clearError}>Chiudi</button>
            <button className="btn-primary btn-sm" onClick={() => toggleApiSetup(true)}>
              <i className="fas fa-cog"></i> Impostazioni API
            </button>
          </div>
        </div>
      )}
      {view === VIEWS.HOME && !showApiSetup && (
        <button className="fab-settings" onClick={() => toggleApiSetup(true)} title="Impostazioni API">
          <i className="fas fa-cog"></i>
        </button>
      )}
      {/* Theme Toggle */}
      <button
        className="fab-theme"
        onClick={() => {
          const current = useUiStore.getState().theme
          const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
          useUiStore.getState().setTheme(next)
        }}
        title={`Tema: ${theme === 'light' ? 'Chiaro' : theme === 'dark' ? 'Scuro' : 'Sistema'}`}
      >
        <i className={`fas ${theme === 'dark' ? 'fa-moon' : theme === 'light' ? 'fa-sun' : 'fa-desktop'}`}></i>
      </button>
    </div>
  )
}
