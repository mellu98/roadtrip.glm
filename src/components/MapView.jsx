import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTripStore } from '../store/tripStore'
import { useUiStore } from '../store/uiStore'
import MapController from './MapController'

const TYPE_CONFIG = {
  attraction: { icon: '🏛️', color: '#6366f1', label: 'Attraction' },
  restaurant: { icon: '🍽️', color: '#0ea5e9', label: 'Restaurant' },
  transport: { icon: '🚗', color: '#64748b', label: 'Transport' },
  activity: { icon: '🎯', color: '#10b981', label: 'Activity' },
  accommodation: { icon: '🏨', color: '#8b5cf6', label: 'Accommodation' },
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity
}

function formatPrice(price) {
  if (!price) return ''
  if (price.type === 'free') return 'Free'
  const amt = price.amount ? `${price.currency || ''} ${price.amount}` : ''
  const suffix = price.type === 'per person' ? '/person' : ''
  return amt + suffix
}

function createCustomIcon(activityType, number) {
  const config = getTypeConfig(activityType)
  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 40px;
    ">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        background: ${config.color};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Inter', -apple-system, sans-serif;
          line-height: 1;
        ">${number}</span>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-marker',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  })
}

function FitBoundsButton({ activities }) {
  const map = useMapEvents({})

  const handleFitBounds = () => {
    if (!activities || activities.length === 0) return
    const bounds = activities.map((a) => [a.location.lat, a.location.lng])
    if (bounds.length === 1) {
      map.setView(bounds[0], 14, { animate: true })
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true })
    }
  }

  return (
    <button
      className="absolute bottom-4 right-4 z-[1000] w-9 h-9 bg-white rounded-lg shadow-lg flex items-center justify-center text-default-600 hover:bg-default-50 transition-colors"
      onClick={handleFitBounds}
      title="Show all points"
      style={{ border: 'none', cursor: 'pointer' }}
    >
      <i className="fas fa-expand"></i>
    </button>
  )
}

export default function MapView() {
  const { currentItinerary } = useTripStore()
  const { activeDay, selectActivity } = useUiStore()

  const days = currentItinerary?.days || []
  const currentDay = days[activeDay]

  const mapActivities = useMemo(() => {
    if (!currentDay?.activities) return []
    return currentDay.activities.filter(
      (a) => a.location && a.location.lat !== 0 && a.location.lng !== 0
        && a.location.lat != null && a.location.lng != null
    )
  }, [currentDay])

  const routePositions = useMemo(() => {
    return mapActivities.map((a) => [a.location.lat, a.location.lng])
  }, [mapActivities])

  if (mapActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-default-500">
        <i className="fas fa-map-marked-alt text-3xl mb-2" />
        <p className="text-sm">No locations available for this day</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={[41.8902, 12.4922]}
      zoom={13}
      style={{ height: '350px', width: '100%' }}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController activities={mapActivities} />

      <FitBoundsButton activities={mapActivities} />

      {routePositions.length > 1 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: '#6366f1',
            weight: 3,
            opacity: 0.7,
            dashArray: '8, 8',
          }}
        />
      )}

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        iconCreateFunction={(cluster) => {
          const count = cluster.getChildCount()
          return L.divIcon({
            html: `<div style="
              background: #6366f1;
              color: white;
              border-radius: 50%;
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 700;
              font-family: 'Inter', -apple-system, sans-serif;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 2px solid white;
            ">${count}</div>`,
            className: 'custom-marker-cluster',
            iconSize: [36, 36],
          })
        }}
      >
        {mapActivities.map((activity, idx) => {
          const config = getTypeConfig(activity.type)
          const icon = createCustomIcon(activity.type, idx + 1)

          return (
            <Marker
              key={activity.id || idx}
              position={[activity.location.lat, activity.location.lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ minWidth: '180px', padding: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ background: config.color + '18', color: config.color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      {config.icon} {config.label}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>#{idx + 1}</span>
                  </div>
                  <h4 style={{ fontWeight: 600, margin: '0 0 6px', fontSize: '14px' }}>{activity.name}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                    {activity.time && <span>🕐 {activity.time}</span>}
                    {activity.duration && <span>⏱ {activity.duration}</span>}
                    {activity.price && <span>💰 {formatPrice(activity.price)}</span>}
                    {activity.rating && <span style={{ color: '#f59e0b' }}>★ {activity.rating}</span>}
                  </div>
                  {activity.location?.address && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                      📍 {activity.location.address}
                    </p>
                  )}
                  <button
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '6px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                    onClick={() => selectActivity(activity)}
                  >
                    Details
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
