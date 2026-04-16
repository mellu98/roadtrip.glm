import { useEffect, useState } from 'react'
import { Button, Card, CardBody } from '@heroui/react'
import { useTripStore } from './store/tripStore'
import { useUiStore, VIEWS } from './store/uiStore'
import { isSharedTrip, decodeTripFromUrl, clearShareHash } from './utils/share'
import { isOnline, onConnectionChange } from './utils/offline'
import pb from './lib/pb'
import AuthScreen from './components/AuthScreen'
import TripForm from './components/TripForm'
import LoadingScreen from './components/LoadingScreen'
import Itinerary from './components/Itinerary'
import SavedTrips from './components/SavedTrips'
import { generateItinerary } from './utils/ai'
import { getTheme, applyTheme } from './utils/theme'

export default function App() {
  const { currentItinerary, isSaved, loadTrips, loadCurrentTrip, setItinerary, saveTrip, clearCurrent } = useTripStore()
  const { view, error, theme, setView, goHome, setError, clearError } = useUiStore()

  const [online, setOnline] = useState(true)
  const [authReady, setAuthReady] = useState(false)

  // Check auth state
  useEffect(() => {
    // Apply saved theme immediately
    const savedTheme = getTheme()
    applyTheme(savedTheme)

    // Listen for auth state changes
    const unsub = pb.authStore.onChange(() => {
      setAuthReady(true)
    })

    // Initial check
    setAuthReady(true)

    return () => unsub()
  }, [])

  // Load data after auth
  useEffect(() => {
    if (!pb.authStore.isValid) return

    // Handle shared trip from URL
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
      useTripStore.getState().fetchWeatherForTrip()
    }
  }, [pb.authStore.token])

  // Online/offline
  useEffect(() => {
    setOnline(isOnline())
    const unsub = onConnectionChange(setOnline)
    return unsub
  }, [])

  const handleNewTrip = () => {
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

  const handleLogout = () => {
    pb.authStore.clear()
    useTripStore.getState().clearCurrent()
    goHome()
  }

  const cycleTheme = () => {
    const current = useUiStore.getState().theme
    const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
    useUiStore.getState().setTheme(next)
  }

  // Not authenticated → show login
  if (!authReady) return null
  if (!pb.authStore.isValid) return <AuthScreen />

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!online && (
        <div className="sticky top-0 z-50 bg-warning/90 text-warning-foreground px-4 py-2 text-sm flex items-center justify-center gap-2 no-print">
          <i className="fas fa-wifi-slash" /> You're offline — saved trips are still available
        </div>
      )}

      {view === VIEWS.HOME && <SavedTrips onNewTrip={handleNewTrip} onLogout={handleLogout} />}
      {view === VIEWS.FORM && <TripForm onGenerate={handleGenerate} onBack={handleBack} />}
      {view === VIEWS.LOADING && <LoadingScreen destination={currentItinerary?.destination} />}
      {view === VIEWS.ITINERARY && currentItinerary && <Itinerary onBack={handleBack} />}

      {error && (
        <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[min(420px,calc(100vw-2rem))] shadow-xl animate-fade-slide-in no-print border border-danger/20">
          <CardBody className="gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-danger text-sm" />
              </div>
              <div className="flex-1">
                <strong className="block text-base">Error</strong>
                <p className="text-sm text-default-500 mt-1">{error}</p>
              </div>
              <Button isIconOnly size="sm" variant="light" onPress={clearError} aria-label="Close error">
                <i className="fas fa-times" />
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="flat" onPress={clearError}>Close</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Button
        isIconOnly
        variant="flat"
        radius="full"
        className="fixed bottom-6 left-6 shadow-lg z-40 no-print"
        onPress={cycleTheme}
        aria-label={`Theme: ${theme}`}
      >
        <i className={`fas ${theme === 'dark' ? 'fa-moon' : theme === 'light' ? 'fa-sun' : 'fa-desktop'}`} />
      </Button>
    </div>
  )
}
