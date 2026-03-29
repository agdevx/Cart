// ABOUTME: Returns a time-of-day greeting based on the current hour

export function getGreeting(hour: number): string {
  if (hour >= 0 && hour <= 10) return 'Good morning'
  if (hour === 11) return 'Good almost afternoon'
  if (hour >= 12 && hour <= 16) return 'Good afternoon'
  return 'Good evening'
}
