// ABOUTME: Home page — placeholder for the home dashboard
// ABOUTME: Will display greeting, trip calendar, and weather summary

import { PageHeader } from '@/shared/page-header'

import { GreetingCard } from './components/greeting-card'

export const HomePage = () => {
  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Home</PageHeader>

      <div className="px-5 space-y-3">
        <GreetingCard
          locationName={null}
          currentWeatherEmoji={null}
          currentTemperature={null}
          currentCondition={null}
        />
      </div>
    </div>
  )
}
