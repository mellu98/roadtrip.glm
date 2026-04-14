import { useState, useEffect, useRef } from 'react'
import { searchPlaces } from '../utils/places'

export default function PlaceSearch({ value, onChange, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    // Chiudi i risultati quando si clicca fuori
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange?.(val)

    // Debounce 400ms
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const places = await searchPlaces(val.trim())
      setResults(places)
      setShowResults(places.length > 0)
      setLoading(false)
    }, 400)
  }

  const handleSelect = (place) => {
    setQuery(place.name)
    setShowResults(false)
    onSelect?.({
      name: place.name,
      fullName: place.fullName,
      lat: place.lat,
      lng: place.lng,
      type: place.type,
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  return (
    <div className="place-search" ref={containerRef}>
      <div className="place-search-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder || 'Cerca una destinazione...'}
          className="input-large"
          autoComplete="off"
        />
        {loading && (
          <span className="place-search-spinner">
            <i className="fas fa-spinner fa-spin"></i>
          </span>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="place-search-results">
          {results.map((place, i) => (
            <button
              key={i}
              className="place-search-result"
              onClick={() => handleSelect(place)}
            >
              <i className="fas fa-map-marker-alt"></i>
              <div className="place-search-result-info">
                <span className="place-search-result-name">{place.name}</span>
                <span className="place-search-result-detail">
                  {place.fullName?.split(',').slice(1, 3).join(',').trim()}
                  {place.type && ` · ${place.type}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
