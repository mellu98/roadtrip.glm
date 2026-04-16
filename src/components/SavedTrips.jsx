import { useRef } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader } from '@heroui/react'
import { useTripStore } from '../store/tripStore'
import { useUiStore, VIEWS } from '../store/uiStore'
import { importJSON } from '../utils/export'

const EMOJIS = ['🇮🇹', '🇪🇸', '🇫🇷', '🇯🇵', '🇬🇧', '🇩🇪', '🇺🇸', '🇧🇷', '🇦🇷', '🇲🇽', '🇬🇷', '🇵🇹', '🇹🇭', '🇲🇦', '🇭🇷', '🌍']

function getTripEmoji(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return EMOJIS[hash % EMOJIS.length]
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function daysBetween(start, end) {
  if (!start || !end) return null
  const diff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : null
}

export default function SavedTrips({ onNewTrip, onLogout }) {
  const { trips, deleteTrip, loadTrip, saveTrip } = useTripStore()
  const { setView } = useUiStore()
  const fileInputRef = useRef(null)

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
      alert('Import error: ' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-28">
      <header className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🗺️</span>
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight">RoadTrip Planner</h1>
            <p className="text-sm text-default-500">Your perfect trip, planned by AI</p>
          </div>
        </div>
        {onLogout && (
          <Button variant="flat" size="sm" onPress={onLogout} startContent={<i className="fas fa-sign-out-alt" />}>
            Logout
          </Button>
        )}
      </header>

      <Button
        color="primary"
        size="lg"
        fullWidth
        className="h-20 text-lg font-semibold mb-8 shadow-md"
        onPress={onNewTrip}
        startContent={<i className="fas fa-plus text-xl" />}
      >
        New Trip
      </Button>

      {trips.length === 0 ? (
        <Card className="py-10 border border-default-200">
          <CardBody className="items-center text-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <span className="text-4xl">✈️</span>
            </div>
            <h2 className="text-xl font-bold">No saved trips</h2>
            <p className="text-default-500 max-w-sm">
              Create your first itinerary and you'll find it here
            </p>
            <Button
              color="primary"
              size="lg"
              onPress={onNewTrip}
              startContent={<i className="fas fa-plus" />}
              className="mt-2"
            >
              Create your first trip
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map(trip => (
            <Card
              key={trip.id}
              isPressable
              onPress={() => handleLoadTrip(trip)}
              shadow="sm"
              className="hover:shadow-lg transition-all hover:-translate-y-0.5 border border-default-200"
            >
              <CardHeader className="flex items-center justify-between pb-0">
                <span className="text-4xl">{getTripEmoji(trip.destination || trip.title || '')}</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={(e) => {
                    if (window.confirm(`Delete "${trip.title || trip.destination}"?`)) {
                      deleteTrip(trip.id)
                    }
                  }}
                  aria-label="Delete trip"
                >
                  <i className="fas fa-trash" />
                </Button>
              </CardHeader>
              <CardBody className="gap-1 text-left">
                <h3 className="text-lg font-bold text-foreground">
                  {trip.title || trip.destination || 'Untitled Trip'}
                </h3>
                {trip.destination && trip.title && trip.title !== trip.destination && (
                  <p className="text-sm text-default-500">{trip.destination}</p>
                )}
                {(trip.startDate || trip.endDate) && (
                  <p className="text-sm text-default-600 flex items-center gap-1.5 mt-2">
                    <i className="fas fa-calendar-alt text-primary/60" />
                    {formatDate(trip.startDate)}
                    {trip.startDate && trip.endDate && ' → '}
                    {formatDate(trip.endDate)}
                    {daysBetween(trip.startDate, trip.endDate) && (
                      <span className="text-default-400">({daysBetween(trip.startDate, trip.endDate)} days)</span>
                    )}
                  </p>
                )}
                {trip.formData?.budget && (
                  <p className="text-sm text-default-600 flex items-center gap-1.5">
                    <i className="fas fa-wallet text-primary/60" />
                    {trip.formData.currency || 'EUR'} {trip.formData.budget?.toLocaleString()}
                  </p>
                )}
                {trip.totalEstimatedCost && (
                  <p className="text-sm text-default-600 flex items-center gap-1.5">
                    <i className="fas fa-receipt text-primary/60" />
                    Estimated: {trip.totalEstimatedCost.currency} {trip.totalEstimatedCost.amount?.toLocaleString()}
                  </p>
                )}
              </CardBody>
              <CardFooter className="pt-0">
                <Button
                  color="primary"
                  size="sm"
                  fullWidth
                  variant="flat"
                  startContent={<i className="fas fa-eye" />}
                  onPress={() => handleLoadTrip(trip)}
                >
                  Open
                </Button>
              </CardFooter>
            </Card>
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
      <Button
        variant="flat"
        className="mt-6"
        startContent={<i className="fas fa-file-import" />}
        onPress={() => fileInputRef.current?.click()}
      >
        Import trip
      </Button>
    </div>
  )
}
