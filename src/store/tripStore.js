import { create } from 'zustand'
import { getTrips, saveTrip as storageSaveTrip, deleteTrip as storageDeleteTrip, getCurrentTrip, setCurrentTrip as storageSetCurrentTrip, generateTripId } from '../utils/storage'
import { fetchWeather } from '../utils/weather'

export const useTripStore = create((set, get) => ({
  // State
  trips: [],
  currentItinerary: null,
  isSaved: false,
  weatherForecasts: [],

  // Actions
  loadTrips: () => {
    const trips = getTrips()
    set({ trips })
  },

  loadCurrentTrip: () => {
    const saved = getCurrentTrip()
    if (saved?.itinerary) {
      const trips = getTrips()
      set({ 
        currentItinerary: saved, 
        isSaved: !!trips.find(t => t.id === saved.id) 
      })
      return true
    }
    return false
  },

  setItinerary: (itinerary) => {
    storageSetCurrentTrip(itinerary)
    const trips = getTrips()
    set({ 
      currentItinerary: itinerary, 
      isSaved: !!trips.find(t => t.id === itinerary.id) 
    })
  },

  saveTrip: (trip) => {
    storageSaveTrip(trip)
    const trips = getTrips()
    set({ trips, isSaved: true })
  },

  deleteTrip: (id) => {
    storageDeleteTrip(id)
    const trips = getTrips()
    set({ trips })
  },

  loadTrip: (trip) => {
    const trips = getTrips()
    storageSetCurrentTrip(trip)
    set({ 
      currentItinerary: trip, 
      isSaved: !!trips.find(t => t.id === trip.id) 
    })
  },

  clearCurrent: () => {
    storageSetCurrentTrip(null)
    set({ currentItinerary: null, isSaved: false, weatherForecasts: [] })
  },

  generateId: () => generateTripId(),

  fetchWeatherForTrip: async () => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    // Calcola coordinate medie del primo giorno con attività
    const firstDay = currentItinerary.days?.[0]
    const firstActivity = firstDay?.activities?.find(a => a.location?.lat && a.location?.lng && !(a.location.lat === 0 && a.location.lng === 0))
    if (!firstActivity) return

    const { lat, lng } = firstActivity.location
    const startDate = currentItinerary.days?.[0]?.date
    const endDate = currentItinerary.days?.[currentItinerary.days.length - 1]?.date

    if (!startDate || !endDate) return

    const forecasts = await fetchWeather(lat, lng, startDate, endDate)
    if (forecasts.length > 0) {
      set({ weatherForecasts: forecasts })
    }
  },

  reorderActivities: (dayIndex, oldIndex, newIndex) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    const day = { ...newDays[dayIndex] }
    const activities = [...day.activities]

    const [moved] = activities.splice(oldIndex, 1)
    activities.splice(newIndex, 0, moved)

    // Re-assign IDs to maintain order
    activities.forEach((act, i) => {
      act.id = `d${dayIndex + 1}a${i + 1}`
    })

    day.activities = activities
    newDays[dayIndex] = day
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary })
  },

  updateActivity: (dayIndex, activityId, updates) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    const day = { ...newDays[dayIndex] }
    day.activities = day.activities.map(act =>
      act.id === activityId ? { ...act, ...updates } : act
    )
    newDays[dayIndex] = day
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary })
  },

  deleteActivity: (dayIndex, activityId) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    const day = { ...newDays[dayIndex] }
    day.activities = day.activities.filter(act => act.id !== activityId)
    newDays[dayIndex] = day
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary, selectedActivity: null, mobileDetailOpen: false })
  },

  addActivity: (dayIndex, activity) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    const day = { ...newDays[dayIndex] }
    day.activities = [...day.activities, activity]
    newDays[dayIndex] = day
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary })
  },

  replaceDay: (dayIndex, newDay) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    newDays[dayIndex] = { ...newDay, dayNumber: dayIndex + 1 }
    // Re-assign activity IDs
    newDays[dayIndex].activities?.forEach((act, i) => {
      act.id = `d${dayIndex + 1}a${i + 1}`
    })
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary })
  },

  replaceActivity: (dayIndex, activityId, newActivity) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    const day = { ...newDays[dayIndex] }
    day.activities = day.activities.map(act =>
      act.id === activityId ? { ...newActivity, id: activityId } : act
    )
    newDays[dayIndex] = day
    newItinerary.days = newDays

    storageSetCurrentTrip(newItinerary)
    set({ currentItinerary: newItinerary })
  },
}))
