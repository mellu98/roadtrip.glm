import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTripStore } from '../store/tripStore'
import { useUiStore } from '../store/uiStore'
import MapController from './MapController'

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
      className="map-fit-btn"
      onClick={handleFitBounds}
      title="Mostra tutti i punti"
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

  // Filter activities that have valid coordinates
  const mapActivities = useMemo(() => {
    if (!currentDay?.activities) return []
    return currentDay.activities.filter(
      (a) => a.location && a.location.lat !== 0 && a.location.lng !== 0
        && a.location.lat != null && a.location.lng != null
    )
  }, [currentDay])

  // Build polyline positions from activities with coords
  const routePositions = useMemo(() => {
    return mapActivities.map((a) => [a.location.lat, a.location.lng])
  }, [mapActivities])

  if (mapActivities.length === 0) {
    return (
      <div className="map-loading">
        <i className="fas fa-map-marked-alt"></i>
        <p>Nessuna posizione disponibile per questo giorno</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={[41.8902, 12.4922]}
      zoom={13}
      className="map-container"
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
            color: '#e07a5f',
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
              background: #3d405b;
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
                <div className="map-popup">
                  <div className="map-popup-header">
                    <span
                      className="map-popup-badge"
                      style={{ background: config.color + '18', color: config.color }}
                    >
                      {config.icon} {config.label}
                    </span>
                    <span className="map-popup-number">#{idx + 1}</span>
                  </div>
                  <h4 className="map-popup-name">{activity.name}</h4>
                  <div className="map-popup-info">
                    {activity.time && (
                      <span><i className="fas fa-clock"></i> {activity.time}</span>
                    )}
                    {activity.duration && (
                      <span><i className="fas fa-hourglass-half"></i> {activity.duration}</span>
                    )}
                    {activity.price && (
                      <span><i className="fas fa-tag"></i> {formatPrice(activity.price)}</span>
                    )}
                    {activity.rating && (
                      <span className="map-popup-rating">★ {activity.rating}</span>
                    )}
                  </div>
                  {activity.location?.address && (
                    <p className="map-popup-address">
                      <i className="fas fa-map-pin"></i> {activity.location.address}
                    </p>
                  )}
                  <button
                    className="map-popup-action"
                    onClick={() => selectActivity(activity)}
                  >
                    <i className="fas fa-info-circle"></i> Dettagli
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
