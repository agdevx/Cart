// ABOUTME: Centralized route path constants and parameterized path helpers
// ABOUTME: All route strings should be imported from here, never hardcoded

export const ROUTES = {
  HOME: '/home',
  LOGIN: '/login',
  REGISTER: '/register',
  PANTRY: '/pantry',
  SHOPPING: '/shopping',
  TRIP_DETAIL: '/shopping/:tripId',
  TRIP_ADD_ITEMS: '/shopping/:tripId/add-items',
  ACTIVE_TRIP: '/shopping/:tripId/active',
  HOUSEHOLD: '/household',
  HOUSEHOLD_CREATE: '/household/create',
  HOUSEHOLD_JOIN: '/household/join',
  HOUSEHOLD_DETAIL: '/household/:id',
  SETTINGS: '/settings',
} as const

export const tripDetailPath = (tripId: string) => `/shopping/${tripId}`
export const tripAddItemsPath = (tripId: string) => `/shopping/${tripId}/add-items`
export const activeTripPath = (tripId: string) => `/shopping/${tripId}/active`
export const householdDetailPath = (id: string) => `/household/${id}`
