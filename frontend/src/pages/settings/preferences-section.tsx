// ABOUTME: Preferences section component for the settings page
// ABOUTME: Handles default page selection and location settings (GPS or manual city search)

import { useEffect, useState } from 'react'

import { MapPin, MapPinOff, Navigation, Search } from 'lucide-react'
import { toast } from 'sonner'

import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useUpdateUserPreferencesMutation } from '@/apis/agdevx-cart-api/user-preferences/update-user-preferences.mutation'
import { useUserPreferencesQuery } from '@/apis/agdevx-cart-api/user-preferences/use-user-preferences.query'
import { Spinner } from '@/shared/spinner'
import { ToggleSwitch } from '@/shared/toggle-switch'

/** All supported default page options with their display labels and route paths */
const DEFAULT_PAGE_OPTIONS = [
  { label: 'Home', path: '/home' },
  { label: 'Shopping', path: '/shopping' },
  { label: 'Pantry', path: '/pantry' },
  { label: 'Household', path: '/household' },
] as const

/** Open-Meteo geocoding API response shape (partial) */
interface GeocodingResult {
  latitude: number
  longitude: number
  name: string
  admin1?: string
  country?: string
}

interface GeocodingResponse {
  results?: GeocodingResult[]
}

export const PreferencesSection = () => {
  const { data: preferences } = useUserPreferencesQuery()
  const { data: household } = useHouseholdQuery()
  const updateMutation = useUpdateUserPreferencesMutation()
  const hasHousehold = !!household

  /** Local state mirrors query data; changes here are unsaved until the user clicks Save */
  const [selectedPage, setSelectedPage] = useState(preferences?.defaultPage ?? '/home')
  const [locationLat, setLocationLat] = useState<number | null>(preferences?.locationLatitude ?? null)
  const [locationLon, setLocationLon] = useState<number | null>(preferences?.locationLongitude ?? null)
  const [locationName, setLocationName] = useState<string | null>(preferences?.locationDisplayName ?? null)
  const [showWeatherIcons, setShowWeatherIcons] = useState(preferences?.showWeatherIcons ?? true)
  const [showWeatherTemps, setShowWeatherTemps] = useState(preferences?.showWeatherTemps ?? true)
  const [showHouseholdPage, setShowHouseholdPage] = useState(preferences?.showHouseholdPage ?? true)
  const [isDirty, setIsDirty] = useState(false)

  const [citySearch, setCitySearch] = useState('')
  const [locationError, setLocationError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  /*
   * Sync local state from query data on initial load and after a successful save.
   * After save, the query cache is invalidated and `preferences` updates — this
   * resets local state and clears dirty so the Save button disappears.
   */
  useEffect(() => {
    setSelectedPage(preferences?.defaultPage ?? '/home')
    setLocationLat(preferences?.locationLatitude ?? null)
    setLocationLon(preferences?.locationLongitude ?? null)
    setLocationName(preferences?.locationDisplayName ?? null)
    setShowWeatherIcons(preferences?.showWeatherIcons ?? true)
    setShowWeatherTemps(preferences?.showWeatherTemps ?? true)
    setShowHouseholdPage(preferences?.showHouseholdPage ?? true)
    setIsDirty(false)
  }, [preferences])

  const handleDefaultPageChange = (path: string) => {
    setSelectedPage(path)
    setIsDirty(true)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        setLocationLat(lat)
        setLocationLon(lon)

        /* Reverse-geocode coordinates to a human-readable city name via Nominatim */
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          const response = await fetch(url, {
            headers: { 'User-Agent': 'AGDevX.Cart/1.0 (https://github.com/AGDevX/Cart)' },
          })
          const data = await response.json()
          const address = data?.address

          if (address) {
            const city = address.city || address.town || address.village || address.hamlet || address.municipality || ''
            const state = address.state || ''
            const country = address.country || ''

            /* "City, State" for US addresses, "City, Country" for international */
            const isUS = address.country_code === 'us'
            const displayName = city
              ? `${city}, ${isUS ? state : country}`
              : `${state || country}`

            setLocationName(displayName)
          } else {
            setLocationName(`Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`)
          }
        } catch {
          /* Fall back to raw coordinates if reverse geocoding fails */
          setLocationName(`Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`)
        }

        setIsDirty(true)
        setIsLocating(false)
      },
      () => {
        setLocationError('Unable to retrieve your location')
        setIsLocating(false)
      }
    )
  }

  const handleCitySearch = async () => {
    const trimmed = citySearch.trim()
    if (!trimmed) return

    setIsSearching(true)
    setLocationError('')

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1`
      const response = await fetch(url)
      const data: GeocodingResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        setLocationError(`No results found for "${trimmed}"`)
        return
      }

      const result = data.results[0]
      const displayName = result.admin1
        ? `${result.name}, ${result.admin1}`
        : `${result.name}, ${result.country ?? ''}`

      setLocationLat(result.latitude)
      setLocationLon(result.longitude)
      setLocationName(displayName)
      setIsDirty(true)
      setCitySearch('')
    } catch {
      setLocationError('Failed to search for location')
    } finally {
      setIsSearching(false)
    }
  }

  const handleClearLocation = () => {
    setLocationLat(null)
    setLocationLon(null)
    setLocationName(null)
    setIsDirty(true)
  }

  const handleCitySearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleCitySearch()
    }
  }

  const handleShowWeatherIconsChange = () => {
    setShowWeatherIcons(prev => !prev)
    setIsDirty(true)
  }

  const handleShowWeatherTempsChange = () => {
    setShowWeatherTemps(prev => !prev)
    setIsDirty(true)
  }

  const handleShowHouseholdPageChange = () => {
    setShowHouseholdPage(prev => !prev)
    setIsDirty(true)
  }

  /** Sends all current local state in a single mutation to avoid partial-update overwrites */
  const handleSave = () => {
    updateMutation.mutate(
      {
        defaultPage: selectedPage,
        locationLatitude: locationLat,
        locationLongitude: locationLon,
        locationDisplayName: locationName,
        showWeatherIcons,
        showWeatherTemps,
        showHouseholdPage,
      },
      {
        onSuccess: () => toast.success('Preferences saved'),
      }
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Preferences</span>
      </div>

      <div className="rounded-xl bg-surface">
        {/* Default Page */}
        <div className="px-4 py-3">
          <div className="text-xs text-text-tertiary mb-2">Default Page</div>
          <div className="flex gap-1.5">
            {DEFAULT_PAGE_OPTIONS.filter((option) => option.path !== '/household' || hasHousehold).map((option) => {
              const isSelected = selectedPage === option.path
              return (
                <button
                  key={option.path}
                  onClick={() => handleDefaultPageChange(option.path)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-display font-bold transition-colors ${
                    isSelected
                      ? 'bg-teal text-white'
                      : 'bg-bg text-navy-muted hover:bg-bg-warm'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Show Weather Icons */}
        <ToggleSwitch
          label="Show weather icons in calendar"
          checked={showWeatherIcons}
          onChange={handleShowWeatherIconsChange}
        />

        {/* Show Weather Temperatures */}
        <ToggleSwitch
          label="Show temperatures in calendar"
          checked={showWeatherTemps}
          onChange={handleShowWeatherTempsChange}
        />

        {/* Show Household Page */}
        <ToggleSwitch
          label="Show Household tab in navigation"
          checked={showHouseholdPage}
          onChange={handleShowHouseholdPageChange}
        />

        <div className="border-t border-bg px-4 py-3">
          {/* Location header + current value */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-tertiary">Location</div>
            {locationName && (
              <button
                onClick={handleClearLocation}
                className="flex items-center gap-1 text-xs font-semibold text-coral hover:text-coral/70 transition-colors"
              >
                <MapPinOff className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {locationName ? (
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="w-3.5 h-3.5 text-teal shrink-0" />
              <span className="text-sm text-navy-soft">{locationName}</span>
            </div>
          ) : (
            <p className="text-sm text-text-tertiary mb-3">No location set</p>
          )}

          {/* Use my location button */}
          <button
            onClick={handleUseMyLocation}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 py-2 mb-2 border border-teal/40 text-teal rounded-xl text-sm font-display font-bold hover:bg-teal/8 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLocating ? <Spinner /> : <Navigation className="w-3.5 h-3.5" />}
            Use my location
          </button>

          {/* Manual city search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              onKeyDown={handleCitySearchKeyDown}
              placeholder="Search city..."
              className="flex-1 min-w-0 px-3 py-2 border border-navy/10 rounded-xl bg-surface text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
            <button
              onClick={() => void handleCitySearch()}
              disabled={isSearching || !citySearch.trim()}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 bg-teal text-white rounded-xl text-sm font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? <Spinner /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
          </div>

          {/* Error message */}
          {locationError && (
            <p className="mt-2 text-xs text-coral">{locationError}</p>
          )}
        </div>

        {/* Save button — only visible when there are unsaved changes */}
        {isDirty && (
          <div className="border-t border-bg px-4 py-3">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending || updateMutation.isSuccess}
              className="w-full flex items-center justify-center py-2.5 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
            >
              {(updateMutation.isPending || updateMutation.isSuccess) ? <Spinner /> : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
