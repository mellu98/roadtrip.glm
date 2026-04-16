const WEATHER_CACHE_KEY = 'roadtrip_weather_cache'
const WEATHER_CACHE_TTL = 3 * 60 * 60 * 1000 // 3 hours

// WMO codes → emoji + description
const WMO_CODES = {
  0:  { emoji: '☀️', desc: 'Sereno', descEn: 'Clear sky' },
  1:  { emoji: '🌤️', desc: 'Prevalentemente sereno', descEn: 'Mainly clear' },
  2:  { emoji: '⛅', desc: 'Parzialmente nuvoloso', descEn: 'Partly cloudy' },
  3:  { emoji: '☁️', desc: 'Coperto', descEn: 'Overcast' },
  45: { emoji: '🌫️', desc: 'Nebbia', descEn: 'Fog' },
  48: { emoji: '🌫️', desc: 'Nebbia con brina', descEn: 'Rime fog' },
  51: { emoji: '🌧️', desc: 'Pioviggine leggera', descEn: 'Light drizzle' },
  53: { emoji: '🌧️', desc: 'Pioviggine moderata', descEn: 'Moderate drizzle' },
  55: { emoji: '🌧️', desc: 'Pioviggine intensa', descEn: 'Dense drizzle' },
  56: { emoji: '🌧️', desc: 'Pioviggine gelata leggera', descEn: 'Light freezing drizzle' },
  57: { emoji: '🌧️', desc: 'Pioviggine gelata intensa', descEn: 'Dense freezing drizzle' },
  61: { emoji: '🌧️', desc: 'Pioggia leggera', descEn: 'Slight rain' },
  63: { emoji: '🌧️', desc: 'Pioggia moderata', descEn: 'Moderate rain' },
  65: { emoji: '🌧️', desc: 'Pioggia intensa', descEn: 'Heavy rain' },
  66: { emoji: '🌧️', desc: 'Pioggia gelata leggera', descEn: 'Light freezing rain' },
  67: { emoji: '🌧️', desc: 'Pioggia gelata intensa', descEn: 'Heavy freezing rain' },
  71: { emoji: '🌨️', desc: 'Neve leggera', descEn: 'Slight snowfall' },
  73: { emoji: '🌨️', desc: 'Neve moderata', descEn: 'Moderate snowfall' },
  75: { emoji: '❄️', desc: 'Neve intensa', descEn: 'Heavy snowfall' },
  77: { emoji: '❄️', desc: 'Granuli di neve', descEn: 'Snow grains' },
  80: { emoji: '🌦️', desc: 'Rovesci leggeri', descEn: 'Slight rain showers' },
  81: { emoji: '🌦️', desc: 'Rovesci moderati', descEn: 'Moderate rain showers' },
  82: { emoji: '⛈️', desc: 'Rovesci violenti', descEn: 'Violent rain showers' },
  85: { emoji: '🌨️', desc: 'Neve leggera a rovesci', descEn: 'Slight snow showers' },
  86: { emoji: '🌨️', desc: 'Neve intensa a rovesci', descEn: 'Heavy snow showers' },
  95: { emoji: '⛈️', desc: 'Temporale', descEn: 'Thunderstorm' },
  96: { emoji: '⛈️', desc: 'Temporale con grandine leggera', descEn: 'Thunderstorm with slight hail' },
  99: { emoji: '⛈️', desc: 'Temporale con grandine forte', descEn: 'Thunderstorm with heavy hail' },
}

function getCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setCache(key, data) {
  try {
    const cache = getCache()
    cache[key] = { data, timestamp: Date.now() }
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full, ignore
  }
}

function getCached(key) {
  const cache = getCache()
  const entry = cache[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > WEATHER_CACHE_TTL) return null
  return entry.data
}

/**
 * Fetch weather forecasts from Open-Meteo API (free, no API key)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of objects { date, weatherCode, tempMax, tempMin, precipitation, windSpeed }
 */
export async function fetchWeather(lat, lng, startDate, endDate) {
  if (!lat || !lng || lat === 0 && lng === 0) return []
  if (!startDate || !endDate) return []

  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${startDate}_${endDate}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode',
      start_date: startDate,
      end_date: endDate,
      timezone: 'auto',
    })

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) return []

    const data = await res.json()
    if (!data.daily) return []

    const result = data.daily.time.map((date, i) => ({
      date,
      weatherCode: data.daily.weathercode?.[i] ?? 0,
      tempMax: data.daily.temperature_2m_max?.[i] ?? null,
      tempMin: data.daily.temperature_2m_min?.[i] ?? null,
      precipitation: data.daily.precipitation_sum?.[i] ?? 0,
      windSpeed: data.daily.wind_speed_10m_max?.[i] ?? 0,
    }))

    setCache(cacheKey, result)
    return result
  } catch {
    return []
  }
}

/**
 * Fetch historical climate averages as fallback
 */
export async function fetchClimateAverages(lat, lng) {
  if (!lat || !lng || lat === 0 && lng === 0) return null

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      start_date: '2000-01-01',
      end_date: '2024-12-31',
      models: 'ECMWF_ERAI',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto',
    })

    const res = await fetch(`https://climate-api.open-meteo.com/v1/climate?${params}`)
    if (!res.ok) return null

    const data = await res.json()
    return data.daily || null
  } catch {
    return null
  }
}

/**
 * Returns emoji for WMO code
 */
export function getWeatherEmoji(code) {
  return WMO_CODES[code]?.emoji || '🌡️'
}

/**
 * Returns English description for WMO code
 */
export function getWeatherDescription(code) {
  return WMO_CODES[code]?.descEn || 'Unknown'
}

/**
 * Find weather for a specific date in the forecasts array
 */
export function getWeatherForDate(forecasts, date) {
  if (!forecasts || !date) return null
  return forecasts.find(f => f.date === date) || null
}
