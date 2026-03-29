// ABOUTME: Greeting card component for the home page dashboard
// ABOUTME: Displays personalized greeting with optional location and weather info

import { useAuth } from '@/auth/use-auth'
import { getGreeting } from '@/utils/greeting'

interface GreetingCardProps {
  readonly locationName: string | null
  readonly currentWeatherEmoji: string | null
  readonly currentTemperature: number | null
  readonly currentCondition: string | null
}

export const GreetingCard = ({
  locationName,
  currentWeatherEmoji,
  currentTemperature,
  currentCondition,
}: GreetingCardProps) => {
  const { user } = useAuth()
  const greeting = getGreeting(new Date().getHours())

  if (!user?.name) { return null }

  return (
    <div className="bg-gradient-to-br from-navy to-navy-soft rounded-xl px-4 py-5">
      <p className="text-xl font-display font-extrabold text-teal-light">
        {greeting}, {user.name} 👋
      </p>

      {(locationName || currentTemperature !== null) && (
        <div className="flex items-center gap-2 mt-3 text-navy-muted text-sm">
          {locationName && <span>📍 {locationName}</span>}

          {locationName && currentTemperature !== null && <span>•</span>}

          {currentTemperature !== null && (
            <span>
              {currentWeatherEmoji} {currentTemperature}°F {currentCondition}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
