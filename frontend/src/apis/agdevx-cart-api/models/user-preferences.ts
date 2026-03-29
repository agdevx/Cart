// ABOUTME: UserPreferences interface representing per-user application settings
// ABOUTME: Covers default page routing and location data for convenience features

export interface UserPreferences {
  defaultPage: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationDisplayName: string | null;
  showWeatherIcons: boolean;
}
