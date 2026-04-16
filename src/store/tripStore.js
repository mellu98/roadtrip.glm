import { create } from 'zustand'
import pb from '../lib/pb'
import { fetchWeather } from '../utils/weather'

export const useTripStore = create((set, get) => ({
  // State
  trips: [],
  currentItinerary: null,
  isSaved: false,
  weatherForecasts: [],

  // Actions
  loadTrips: async () => {
    if (!pb.authStore.isValid) return
    try {
      const records = await pb.collection('trips').getFullList({
        sort: '-created',
      })
      const trips = records.map(r => recordToTrip(r))
      set({ trips })
    } catch (err) {
      console.error('Failed to load trips:', err)
      set({ trips: [] })
    }
  },

  loadCurrentTrip: () => {
    // Load from localStorage for current session (shared trips, etc.)
    const saved = localStorage.getItem('roadtrip_current')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.itinerary) {
          const { trips } = get()
          set({
            currentItinerary: parsed.itinerary,
            isSaved: !!trips.find(t => t.id === parsed.itinerary.id || t.pbId === parsed.itinerary.pbId)
          })
          return true
        }
      } catch {}
    }
    return false
  },

  setItinerary: (itinerary) => {
    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary }))
    const { trips } = get()
    set({
      currentItinerary: itinerary,
      isSaved: !!trips.find(t => t.id === itinerary.id || t.pbId === itinerary.pbId)
    })
  },

  saveTrip: async (trip) => {
    if (!trip) return
    try {
      if (trip.pbId) {
        // Update existing record
        await pb.collection('trips').update(trip.pbId, {
          title: trip.title,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          formData: trip.formData,
          itinerary: trip,
        })
      } else {
        // Create new record
        const record = await pb.collection('trips').create({
          title: trip.title || trip.destination,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          formData: trip.formData,
          itinerary: trip,
        })
        // Store the PocketBase id
        trip.pbId = record.id
      }
      // Refresh trips list
      await get().loadTrips()
      set({ isSaved: true })
      localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: trip }))
    } catch (err) {
      console.error('Failed to save trip:', err)
    }
  },

  deleteTrip: async (id) => {
    try {
      // Find the trip to get its pbId
      const { trips } = get()
      const trip = trips.find(t => t.id === id)
      if (trip?.pbId) {
        await pb.collection('trips').delete(trip.pbId)
      }
      await get().loadTrips()
    } catch (err) {
      console.error('Failed to delete trip:', err)
    }
  },

  loadTrip: (trip) => {
    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: trip }))
    const { trips } = get()
    set({
      currentItinerary: trip,
      isSaved: !!trips.find(t => t.id === trip.id || t.pbId === trip.pbId)
    })
  },

  clearCurrent: () => {
    localStorage.removeItem('roadtrip_current')
    set({ currentItinerary: null, isSaved: false, weatherForecasts: [] })
  },

  generateId: () => {
    return 'trip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  },

  fetchWeatherForTrip: async () => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

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

    activities.forEach((act, i) => {
      act.id = `d${dayIndex + 1}a${i + 1}`
    })

    day.activities = activities
    newDays[dayIndex] = day
    newItinerary.days = newDays

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
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

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
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

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
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

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
    set({ currentItinerary: newItinerary })
  },

  replaceDay: (dayIndex, newDay) => {
    const { currentItinerary } = get()
    if (!currentItinerary) return

    const newItinerary = { ...currentItinerary }
    const newDays = [...newItinerary.days]
    newDays[dayIndex] = { ...newDay, dayNumber: dayIndex + 1 }
    newDays[dayIndex].activities?.forEach((act, i) => {
      act.id = `d${dayIndex + 1}a${i + 1}`
    })
    newItinerary.days = newDays

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
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

    localStorage.setItem('roadtrip_current', JSON.stringify({ itinerary: newItinerary }))
    set({ currentItinerary: newItinerary })
  },
}))

// Convert PocketBase record to trip object
function recordToTrip(record) {
  let itinerary = {}
  try {
    itinerary = typeof record.itinerary === 'string' ? JSON.parse(record.itinerary) : (record.itinerary || {})
  } catch {
    itinerary = {}
  }

  let formData = {}
  try {
    formData = typeof record.formData === 'string' ? JSON.parse(record.formData) : (record.formData || {})
  } catch {
    formData = {}
  }

  return {
    ...itinerary,
    pbId: record.id,
    id: itinerary.id || record.id,
    title: record.title || itinerary.title,
    destination: record.destination || itinerary.destination,
    startDate: record.startDate || itinerary.startDate,
    endDate: record.endDate || itinerary.endDate,
    formData: { ...formData, ...itinerary.formData },
    createdAt: record.created || itinerary.createdAt,
  }
}
