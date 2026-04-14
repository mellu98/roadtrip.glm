import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { useUiStore } from '../store/uiStore'

export default function MapController({ activities }) {
  const map = useMap()
  const { activeDay, selectedActivity } = useUiStore()

  // Fit bounds when activeDay changes
  useEffect(() => {
    if (!activities || activities.length === 0) return

    const bounds = activities.map((a) => [a.location.lat, a.location.lng])
    if (bounds.length === 1) {
      map.setView(bounds[0], 14, { animate: true })
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true })
    }
  }, [activeDay, activities, map])

  // Re-center when an activity is selected from the timeline
  useEffect(() => {
    if (!selectedActivity?.location) return
    const { lat, lng } = selectedActivity.location
    if (lat === 0 && lng === 0) return
    map.setView([lat, lng], 16, { animate: true })
  }, [selectedActivity, map])

  return null
}
