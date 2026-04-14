import { getWeatherEmoji, getWeatherDescription } from '../utils/weather'

/**
 * Badge meteo compatto (per day tabs)
 */
export function WeatherCompact({ weather }) {
  if (!weather) return null

  return (
    <span className="weather-compact" title={getWeatherDescription(weather.weatherCode)}>
      {getWeatherEmoji(weather.weatherCode)}
      {weather.tempMax !== null && (
        <span className="weather-compact-temp">
          {Math.round(weather.tempMax)}°
        </span>
      )}
    </span>
  )
}

/**
 * Badge meteo esteso (per day header)
 */
export function WeatherExpanded({ weather }) {
  if (!weather) return null

  const emoji = getWeatherEmoji(weather.weatherCode)
  const desc = getWeatherDescription(weather.weatherCode)
  const hasRain = weather.precipitation > 0
  const hasWind = weather.windSpeed > 30

  return (
    <div className="weather-expanded">
      <div className="weather-main">
        <span className="weather-emoji">{emoji}</span>
        <div className="weather-info">
          <span className="weather-desc">{desc}</span>
          <span className="weather-temps">
            {weather.tempMax !== null && (
              <span className="temp-max">{Math.round(weather.tempMax)}°</span>
            )}
            {weather.tempMin !== null && (
              <span className="temp-min">/ {Math.round(weather.tempMin)}°</span>
            )}
          </span>
        </div>
      </div>
      <div className="weather-details">
        {hasRain && (
          <span className="weather-detail rain">
            <i className="fas fa-tint"></i> {weather.precipitation.toFixed(1)} mm
          </span>
        )}
        {hasWind && (
          <span className="weather-detail wind">
            <i className="fas fa-wind"></i> {Math.round(weather.windSpeed)} km/h
          </span>
        )}
      </div>
    </div>
  )
}
