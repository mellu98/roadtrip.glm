import { useState, useEffect, useRef } from 'react'
import { Input, Spinner } from '@heroui/react'
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
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (val) => {
    setQuery(val)
    onChange?.(val)

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
    <div className="relative" ref={containerRef}>
      <Input
        value={query}
        onValueChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setShowResults(true)}
        placeholder={placeholder || 'Search for a destination...'}
        autoComplete="off"
        size="lg"
        variant="bordered"
        startContent={<i className="fas fa-map-marker-alt text-default-400" />}
        endContent={loading ? <Spinner size="sm" /> : null}
      />

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-content1 border border-default-200 rounded-medium shadow-lg overflow-hidden z-50 max-h-80 overflow-y-auto scrollbar-thin">
          {results.map((place, i) => (
            <button
              key={i}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-default-100 transition-colors border-b border-default-100 last:border-0"
              onClick={() => handleSelect(place)}
            >
              <i className="fas fa-map-marker-alt text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">{place.name}</div>
                <div className="text-xs text-default-500 truncate">
                  {place.fullName?.split(',').slice(1, 3).join(',').trim()}
                  {place.type && ` · ${place.type}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
