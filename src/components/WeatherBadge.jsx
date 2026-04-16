import { Chip } from '@heroui/react'
import { getWeatherEmoji, getWeatherDescription } from '../utils/weather'

export function WeatherCompact({ weather }) {
  if (!weather) return null

  return (
    <span
      className="inline-flex items-center gap-1 text-xs"
      title={getWeatherDescription(weather.weatherCode)}
    >
      <span>{getWeatherEmoji(weather.weatherCode)}</span>
      {weather.tempMax !== null && (
        <span className="font-semibold text-default-600">
          {Math.round(weather.tempMax)}°
        </span>
      )}
    </span>
  )
}

export function WeatherExpanded({ weather }) {
  if (!weather) return null

  const emoji = getWeatherEmoji(weather.weatherCode)
  const desc = getWeatherDescription(weather.weatherCode)
  const hasRain = weather.precipitation > 0
  const hasWind = weather.windSpeed > 30

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-primary/5 border border-primary/15 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{emoji}</span>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-foreground capitalize">{desc}</span>
          <span className="text-sm text-default-500">
            {weather.tempMax !== null && (
              <span className="font-semibold text-foreground">{Math.round(weather.tempMax)}°</span>
            )}
            {weather.tempMin !== null && (
              <span className="ml-1">/ {Math.round(weather.tempMin)}°</span>
            )}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hasRain && (
          <Chip size="sm" variant="flat" color="primary" startContent={<i className="fas fa-tint ml-1" />}>
            {weather.precipitation.toFixed(1)} mm
          </Chip>
        )}
        {hasWind && (
          <Chip size="sm" variant="flat" color="default" startContent={<i className="fas fa-wind ml-1" />}>
            {Math.round(weather.windSpeed)} km/h
          </Chip>
        )}
      </div>
    </div>
  )
}
