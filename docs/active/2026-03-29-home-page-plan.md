# Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Home page with greeting panel, monthly trip calendar with weather integration, and configurable default landing page.

**Architecture:** Backend adds `TripDate` to Trip and a new `UserPreferences` table with default page + location fields. Frontend adds a Home page with greeting card and calendar components, fetches weather directly from Open-Meteo (no backend proxy), and updates navigation/routing/settings.

**Tech Stack:** .NET 10 / EF Core (backend), React 19 / TanStack Query / Tailwind CSS 4 / Jotai (frontend), Open-Meteo API (weather)

---

### Task 1: Add TripDate to Trip Model + Migration

**Files:**
- Modify: `backend/AGDevX.Cart.Data/Models/Trip.cs`
- Create: `backend/AGDevX.Cart.Data/Migrations/<timestamp>_AddTripDateToTrip.cs` (auto-generated)
- Modify: `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs`
- Modify: `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`

- [ ] **Step 1: Add TripDate property to Trip entity**

In `backend/AGDevX.Cart.Data/Models/Trip.cs`, add:

```csharp
public DateOnly? TripDate { get; set; }
```

Add it after the `StartedAt` property, before `Collaborators`.

- [ ] **Step 2: Add TripDate to CreateTripRequest DTO**

In `backend/AGDevX.Cart.Shared/DTOs/CreateTripRequest.cs`, add:

```csharp
public DateOnly? TripDate { get; set; }
```

- [ ] **Step 3: Add TripDate to UpdateTripRequest DTO**

In `backend/AGDevX.Cart.Shared/DTOs/UpdateTripRequest.cs`, add:

```csharp
public DateOnly? TripDate { get; set; }
```

- [ ] **Step 4: Generate the migration**

Run from `backend/`:

```bash
dotnet ef migrations add AddTripDateToTrip --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 5: Edit migration to backfill existing trips**

In the generated migration's `Up()` method, after the `AddColumn` call, add SQL to backfill:

```csharp
migrationBuilder.Sql(@"
    UPDATE Trips
    SET TripDate = date(CompletedAt)
    WHERE IsCompleted = 1 AND CompletedAt IS NOT NULL;

    UPDATE Trips
    SET TripDate = date(CreatedDate)
    WHERE TripDate IS NULL AND CreatedDate IS NOT NULL;
");
```

- [ ] **Step 6: Update TripService to set TripDate on create**

In `backend/AGDevX.Cart.Services/TripService.cs`, in the `CreateTrip` method, set `TripDate` from the request:

```csharp
TripDate = request.TripDate,
```

Add it alongside the existing `Name` assignment.

- [ ] **Step 7: Update TripService to set TripDate on update**

In `backend/AGDevX.Cart.Services/TripService.cs`, in the `UpdateTrip` method, add:

```csharp
trip.TripDate = request.TripDate;
```

Add it alongside the existing `trip.Name = request.Name;` line.

- [ ] **Step 8: Run tests to verify nothing broke**

```bash
cd backend && dotnet test
```

Expected: All existing tests pass. The new field is nullable so no existing tests should break.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: add TripDate field to Trip model with backfill migration"
```

---

### Task 2: Add UserPreferences Model + Migration + Endpoints

**Files:**
- Create: `backend/AGDevX.Cart.Data/Models/UserPreferences.cs`
- Modify: `backend/AGDevX.Cart.Data/CartDbContext.cs`
- Create: `backend/AGDevX.Cart.Data/Migrations/<timestamp>_AddUserPreferences.cs` (auto-generated)
- Create: `backend/AGDevX.Cart.Data/Repositories/UserPreferencesRepository.cs`
- Create: `backend/AGDevX.Cart.Data/Repositories/IUserPreferencesRepository.cs`
- Create: `backend/AGDevX.Cart.Services/UserPreferencesService.cs`
- Create: `backend/AGDevX.Cart.Services/IUserPreferencesService.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/UserPreferencesResponse.cs`
- Create: `backend/AGDevX.Cart.Shared/DTOs/UpdateUserPreferencesRequest.cs`
- Create: `backend/AGDevX.Cart.Api/Controllers/UserPreferencesController.cs`
- Modify: `backend/AGDevX.Cart.Api/Program.cs`

- [ ] **Step 1: Create UserPreferences entity**

Create `backend/AGDevX.Cart.Data/Models/UserPreferences.cs`:

```csharp
namespace AGDevX.Cart.Data.Models;

public class UserPreferences : BaseEntity
{
    public Guid UserId { get; set; }

    public string? DefaultPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }

    public User User { get; set; } = null!;
}
```

- [ ] **Step 2: Register DbSet and configure relationship in CartDbContext**

In `backend/AGDevX.Cart.Data/CartDbContext.cs`:

Add DbSet:

```csharp
public DbSet<UserPreferences> UserPreferences { get; set; }
```

In `OnModelCreating`, add:

```csharp
modelBuilder.Entity<UserPreferences>(entity =>
{
    entity.HasIndex(e => e.UserId).IsUnique();

    entity.HasOne(e => e.User)
        .WithOne()
        .HasForeignKey<UserPreferences>(e => e.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});
```

- [ ] **Step 3: Generate migration**

```bash
cd backend && dotnet ef migrations add AddUserPreferences --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

- [ ] **Step 4: Create repository interface**

Create `backend/AGDevX.Cart.Data/Repositories/IUserPreferencesRepository.cs`:

```csharp
using AGDevX.Cart.Data.Models;

namespace AGDevX.Cart.Data.Repositories;

public interface IUserPreferencesRepository
{
    Task<UserPreferences?> GetByUserId(Guid userId, CancellationToken cancellationToken = default);

    Task<UserPreferences> CreateOrUpdate(UserPreferences preferences, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 5: Create repository implementation**

Create `backend/AGDevX.Cart.Data/Repositories/UserPreferencesRepository.cs`:

```csharp
using AGDevX.Cart.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace AGDevX.Cart.Data.Repositories;

public class UserPreferencesRepository(CartDbContext context) : IUserPreferencesRepository
{
    public async Task<UserPreferences?> GetByUserId(Guid userId, CancellationToken cancellationToken = default)
    {
        return await context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
    }

    public async Task<UserPreferences> CreateOrUpdate(UserPreferences preferences, CancellationToken cancellationToken = default)
    {
        var existing = await GetByUserId(preferences.UserId, cancellationToken);

        if (existing is null)
        {
            context.UserPreferences.Add(preferences);
        }
        else
        {
            existing.DefaultPage = preferences.DefaultPage;
            existing.LocationLatitude = preferences.LocationLatitude;
            existing.LocationLongitude = preferences.LocationLongitude;
            existing.LocationDisplayName = preferences.LocationDisplayName;
            context.UserPreferences.Update(existing);
        }

        await context.SaveChangesAsync(cancellationToken);
        return existing ?? preferences;
    }
}
```

- [ ] **Step 6: Create DTOs**

Create `backend/AGDevX.Cart.Shared/DTOs/UserPreferencesResponse.cs`:

```csharp
namespace AGDevX.Cart.Shared.DTOs;

public class UserPreferencesResponse
{
    public string? DefaultPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }
}
```

Create `backend/AGDevX.Cart.Shared/DTOs/UpdateUserPreferencesRequest.cs`:

```csharp
namespace AGDevX.Cart.Shared.DTOs;

public class UpdateUserPreferencesRequest
{
    public string? DefaultPage { get; set; }

    public double? LocationLatitude { get; set; }

    public double? LocationLongitude { get; set; }

    public string? LocationDisplayName { get; set; }
}
```

- [ ] **Step 7: Create service interface**

Create `backend/AGDevX.Cart.Services/IUserPreferencesService.cs`:

```csharp
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public interface IUserPreferencesService
{
    Task<UserPreferencesResponse> GetPreferences(Guid userId, CancellationToken cancellationToken = default);

    Task<UserPreferencesResponse> UpdatePreferences(Guid userId, UpdateUserPreferencesRequest request, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 8: Create service implementation**

Create `backend/AGDevX.Cart.Services/UserPreferencesService.cs`:

```csharp
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.DTOs;

namespace AGDevX.Cart.Services;

public class UserPreferencesService(IUserPreferencesRepository repository) : IUserPreferencesService
{
    public async Task<UserPreferencesResponse> GetPreferences(Guid userId, CancellationToken cancellationToken = default)
    {
        var prefs = await repository.GetByUserId(userId, cancellationToken);

        return new UserPreferencesResponse
        {
            DefaultPage = prefs?.DefaultPage,
            LocationLatitude = prefs?.LocationLatitude,
            LocationLongitude = prefs?.LocationLongitude,
            LocationDisplayName = prefs?.LocationDisplayName,
        };
    }

    public async Task<UserPreferencesResponse> UpdatePreferences(Guid userId, UpdateUserPreferencesRequest request, CancellationToken cancellationToken = default)
    {
        var prefs = new UserPreferences
        {
            UserId = userId,
            DefaultPage = request.DefaultPage,
            LocationLatitude = request.LocationLatitude,
            LocationLongitude = request.LocationLongitude,
            LocationDisplayName = request.LocationDisplayName,
        };

        var saved = await repository.CreateOrUpdate(prefs, cancellationToken);

        return new UserPreferencesResponse
        {
            DefaultPage = saved.DefaultPage,
            LocationLatitude = saved.LocationLatitude,
            LocationLongitude = saved.LocationLongitude,
            LocationDisplayName = saved.LocationDisplayName,
        };
    }
}
```

- [ ] **Step 9: Create controller**

Create `backend/AGDevX.Cart.Api/Controllers/UserPreferencesController.cs`:

```csharp
using AGDevX.Cart.Auth.Extensions;
using AGDevX.Cart.Services;
using AGDevX.Cart.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AGDevX.Cart.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/user/preferences")]
public class UserPreferencesController(IUserPreferencesService preferencesService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();
            var preferences = await preferencesService.GetPreferences(userId, cancellationToken);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { errorCode = "INTERNAL_ERROR", message = ex.Message });
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdateUserPreferencesRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var userId = User.GetUserId();
            var preferences = await preferencesService.UpdatePreferences(userId, request, cancellationToken);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { errorCode = "INTERNAL_ERROR", message = ex.Message });
        }
    }
}
```

- [ ] **Step 10: Register services in Program.cs**

In `backend/AGDevX.Cart.Api/Program.cs`, add with the other repository registrations:

```csharp
builder.Services.AddScoped<IUserPreferencesRepository, UserPreferencesRepository>();
```

And with the other service registrations:

```csharp
builder.Services.AddScoped<IUserPreferencesService, UserPreferencesService>();
```

Add the necessary `using` statements at the top.

- [ ] **Step 11: Run all backend tests**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git add backend/
git commit -m "feat: add UserPreferences model with default page and location fields"
```

---

### Task 3: Backend Tests for UserPreferences

**Files:**
- Create: `backend/AGDevX.Cart.Services.Tests/UserPreferencesServiceTests.cs`
- Create: `backend/AGDevX.Cart.Api.Tests/Controllers/UserPreferencesControllerTests.cs`

- [ ] **Step 1: Write service tests**

Create `backend/AGDevX.Cart.Services.Tests/UserPreferencesServiceTests.cs` following the existing test patterns in the project. Test:

- `GetPreferences` returns empty response when no preferences exist
- `GetPreferences` returns populated response when preferences exist
- `UpdatePreferences` creates preferences when none exist
- `UpdatePreferences` updates existing preferences

Mock `IUserPreferencesRepository` using the same mocking approach as other service tests in the project.

- [ ] **Step 2: Run service tests**

```bash
cd backend && dotnet test --filter "FullyQualifiedName~UserPreferencesServiceTests"
```

Expected: All tests pass.

- [ ] **Step 3: Write controller tests**

Create `backend/AGDevX.Cart.Api.Tests/Controllers/UserPreferencesControllerTests.cs` following the existing controller test patterns. Test:

- `GET /api/v1/user/preferences` returns 200 with preferences
- `PUT /api/v1/user/preferences` returns 200 with updated preferences
- Both endpoints return 500 on service exception

Mock `IUserPreferencesService` using the same approach as other controller tests.

- [ ] **Step 4: Run controller tests**

```bash
cd backend && dotnet test --filter "FullyQualifiedName~UserPreferencesControllerTests"
```

Expected: All tests pass.

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "test: add UserPreferences service and controller tests"
```

---

### Task 4: Backend Tests for TripDate

**Files:**
- Modify: existing trip service and controller test files

- [ ] **Step 1: Add TripDate tests to trip service tests**

In the existing trip service test file, add tests for:

- `CreateTrip` sets `TripDate` when provided in request
- `CreateTrip` leaves `TripDate` null when not provided
- `UpdateTrip` updates `TripDate` when provided

- [ ] **Step 2: Run trip service tests**

```bash
cd backend && dotnet test --filter "FullyQualifiedName~TripServiceTests"
```

Expected: All tests pass.

- [ ] **Step 3: Add TripDate tests to trip controller tests**

In the existing trip controller test file, add tests for:

- `POST /api/v1/trip` accepts and returns `TripDate`
- `PUT /api/v1/trip/{id}` accepts and returns updated `TripDate`

- [ ] **Step 4: Run full backend test suite**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "test: add TripDate tests for trip service and controller"
```

---

### Task 5: Frontend Trip Model + User Preferences API Hooks

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/models/trip.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/user-preferences.ts`
- Create: `frontend/src/apis/agdevx-cart-api/user-preferences/use-user-preferences.query.ts`
- Create: `frontend/src/apis/agdevx-cart-api/user-preferences/update-user-preferences.mutation.ts`

- [ ] **Step 1: Add tripDate to Trip model**

In `frontend/src/apis/agdevx-cart-api/models/trip.ts`, add to the `Trip` interface:

```typescript
tripDate: string | null;
```

- [ ] **Step 2: Create UserPreferences model**

Create `frontend/src/apis/agdevx-cart-api/models/user-preferences.ts`:

```typescript
export interface UserPreferences {
  defaultPage: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationDisplayName: string | null;
}
```

- [ ] **Step 3: Create useUserPreferencesQuery hook**

Create `frontend/src/apis/agdevx-cart-api/user-preferences/use-user-preferences.query.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/auth/use-auth'

import { apiFetch } from '../agdevx-cart-api-config'
import type { UserPreferences } from '../models/user-preferences'

export const useUserPreferencesQuery = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ['user-preferences'],
    queryFn: async (): Promise<UserPreferences> => {
      const response = await apiFetch('/api/v1/user/preferences')
      return response.json()
    },
    enabled: isAuthenticated,
  })
}
```

- [ ] **Step 4: Create useUpdateUserPreferencesMutation hook**

Create `frontend/src/apis/agdevx-cart-api/user-preferences/update-user-preferences.mutation.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'
import type { UserPreferences } from '../models/user-preferences'

interface UpdateUserPreferencesRequest {
  defaultPage?: string | null
  locationLatitude?: number | null
  locationLongitude?: number | null
  locationDisplayName?: string | null
}

export const useUpdateUserPreferencesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['user-preferences', 'update'],
    mutationFn: async (request: UpdateUserPreferencesRequest): Promise<UserPreferences> => {
      const response = await apiFetch('/api/v1/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(request),
      })
      return response.json() as Promise<UserPreferences>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/apis/
git commit -m "feat: add TripDate to Trip model and user preferences API hooks"
```

---

### Task 6: Frontend User Preferences API Tests

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/user-preferences/tests/use-user-preferences.query.test.tsx`
- Create: `frontend/src/apis/agdevx-cart-api/user-preferences/tests/update-user-preferences.mutation.test.tsx`

- [ ] **Step 1: Write query hook test**

Create `frontend/src/apis/agdevx-cart-api/user-preferences/tests/use-user-preferences.query.test.tsx` following the exact pattern from `use-trips.query.test.tsx`:

- Mock `useAuth` and `apiFetch`
- Test: fetches preferences successfully when authenticated
- Test: does not fetch when not authenticated
- Test: handles fetch error

- [ ] **Step 2: Run query test**

```bash
cd frontend && npx vitest run src/apis/agdevx-cart-api/user-preferences/tests/use-user-preferences.query.test.tsx
```

Expected: All tests pass.

- [ ] **Step 3: Write mutation hook test**

Create `frontend/src/apis/agdevx-cart-api/user-preferences/tests/update-user-preferences.mutation.test.tsx` following the exact pattern from `create-trip.mutation.test.ts`:

- Mock `globalThis.fetch`
- Render with `QueryClientProvider`
- Test: updates preferences successfully
- Test: invalidates user-preferences query on success
- Test: handles error response

- [ ] **Step 4: Run mutation test**

```bash
cd frontend && npx vitest run src/apis/agdevx-cart-api/user-preferences/tests/update-user-preferences.mutation.test.tsx
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/user-preferences/tests/
git commit -m "test: add user preferences query and mutation hook tests"
```

---

### Task 7: Weather Utility + Open-Meteo API Hooks

**Files:**
- Create: `frontend/src/utils/weather.ts`
- Create: `frontend/src/apis/open-meteo/use-historical-weather.query.ts`
- Create: `frontend/src/apis/open-meteo/use-forecast-weather.query.ts`
- Create: `frontend/src/apis/open-meteo/weather-types.ts`

- [ ] **Step 1: Create weather types**

Create `frontend/src/apis/open-meteo/weather-types.ts`:

```typescript
export interface DailyWeather {
  date: string
  weatherCode: number
  temperatureMax: number
}

export interface WeatherByDate {
  [date: string]: DailyWeather
}
```

- [ ] **Step 2: Create weather utility**

Create `frontend/src/utils/weather.ts`:

```typescript
export type WeatherCondition = 'sunny' | 'cloudy' | 'rain'

/**
 * Maps WMO weather codes to simplified conditions.
 * See: https://open-meteo.com/en/docs#weathervariables
 */
export function getWeatherCondition(code: number): WeatherCondition {
  if (code <= 1) return 'sunny'
  if (code <= 3) return 'cloudy'
  return 'rain'
}

/**
 * Returns a weather emoji for display in popovers.
 */
export function getWeatherEmoji(code: number): string {
  const condition = getWeatherCondition(code)

  if (condition === 'sunny') return '☀️'
  if (condition === 'cloudy') return '⛅'
  return '🌧️'
}

/**
 * Returns a human-readable condition label.
 */
export function getWeatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly Clear'
  if (code === 2) return 'Partly Cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 49) return 'Foggy'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain Showers'
  if (code <= 86) return 'Snow Showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Unknown'
}

const WEATHER_TINT_COLORS: Record<WeatherCondition, [number, number, number]> = {
  sunny: [254, 220, 100],
  cloudy: [180, 200, 220],
  rain: [150, 190, 250],
}

const MIN_TEMP = 30
const MAX_TEMP = 100
const MIN_ALPHA = 0.10
const MAX_ALPHA = 0.55

/**
 * Returns a CSS rgba background color for a calendar cell.
 * The alpha scales with temperature (warmer = stronger tint).
 */
export function getWeatherTintColor(code: number, temperatureF: number, isPast: boolean): string {
  const condition = getWeatherCondition(code)
  const [r, g, b] = WEATHER_TINT_COLORS[condition]

  const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temperatureF))
  const ratio = (clamped - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)
  let alpha = MIN_ALPHA + ratio * (MAX_ALPHA - MIN_ALPHA)

  if (isPast) {
    alpha *= 0.5
  }

  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`
}
```

- [ ] **Step 3: Create forecast weather hook**

Create `frontend/src/apis/open-meteo/use-forecast-weather.query.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'

import type { WeatherByDate } from './weather-types'

interface ForecastParams {
  latitude: number | null
  longitude: number | null
}

export const useForecastWeatherQuery = ({ latitude, longitude }: ForecastParams) => {
  return useQuery({
    queryKey: ['weather', 'forecast', latitude, longitude],
    queryFn: async (): Promise<WeatherByDate> => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=16`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch forecast weather')
      }

      const data = await response.json()
      const result: WeatherByDate = {}

      for (let i = 0; i < data.daily.time.length; i++) {
        result[data.daily.time[i]] = {
          date: data.daily.time[i],
          weatherCode: data.daily.weather_code[i],
          temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
        }
      }

      return result
    },
    enabled: latitude !== null && longitude !== null,
    staleTime: 30 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Create historical weather hook**

Create `frontend/src/apis/open-meteo/use-historical-weather.query.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'

import type { WeatherByDate } from './weather-types'

interface HistoricalParams {
  latitude: number | null
  longitude: number | null
  startDate: string
  endDate: string
}

export const useHistoricalWeatherQuery = ({ latitude, longitude, startDate, endDate }: HistoricalParams) => {
  return useQuery({
    queryKey: ['weather', 'historical', latitude, longitude, startDate, endDate],
    queryFn: async (): Promise<WeatherByDate> => {
      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=weather_code,temperature_2m_max&temperature_unit=fahrenheit&timezone=auto`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch historical weather')
      }

      const data = await response.json()
      const result: WeatherByDate = {}

      for (let i = 0; i < data.daily.time.length; i++) {
        result[data.daily.time[i]] = {
          date: data.daily.time[i],
          weatherCode: data.daily.weather_code[i],
          temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
        }
      }

      return result
    },
    enabled: latitude !== null && longitude !== null && startDate !== '' && endDate !== '',
    staleTime: 30 * 60 * 1000,
  })
}
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/weather.ts frontend/src/apis/open-meteo/
git commit -m "feat: add weather utility and Open-Meteo API hooks"
```

---

### Task 8: Weather Utility Tests

**Files:**
- Create: `frontend/src/utils/tests/weather.test.ts`

- [ ] **Step 1: Write weather utility tests**

Create `frontend/src/utils/tests/weather.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import {
  getWeatherCondition,
  getWeatherEmoji,
  getWeatherLabel,
  getWeatherTintColor,
} from '../weather'

describe('getWeatherCondition', () => {
  it('returns sunny for code 0 (clear sky)', () => {
    expect(getWeatherCondition(0)).toBe('sunny')
  })

  it('returns sunny for code 1 (mainly clear)', () => {
    expect(getWeatherCondition(1)).toBe('sunny')
  })

  it('returns cloudy for code 2 (partly cloudy)', () => {
    expect(getWeatherCondition(2)).toBe('cloudy')
  })

  it('returns cloudy for code 3 (overcast)', () => {
    expect(getWeatherCondition(3)).toBe('cloudy')
  })

  it('returns rain for code 61 (slight rain)', () => {
    expect(getWeatherCondition(61)).toBe('rain')
  })

  it('returns rain for code 95 (thunderstorm)', () => {
    expect(getWeatherCondition(95)).toBe('rain')
  })
})

describe('getWeatherEmoji', () => {
  it('returns sun emoji for sunny', () => {
    expect(getWeatherEmoji(0)).toBe('☀️')
  })

  it('returns cloud emoji for cloudy', () => {
    expect(getWeatherEmoji(2)).toBe('⛅')
  })

  it('returns rain emoji for rain', () => {
    expect(getWeatherEmoji(61)).toBe('🌧️')
  })
})

describe('getWeatherLabel', () => {
  it('returns Clear for code 0', () => {
    expect(getWeatherLabel(0)).toBe('Clear')
  })

  it('returns Rain for code 63', () => {
    expect(getWeatherLabel(63)).toBe('Rain')
  })

  it('returns Thunderstorm for code 95', () => {
    expect(getWeatherLabel(95)).toBe('Thunderstorm')
  })
})

describe('getWeatherTintColor', () => {
  it('returns rgba string with yellow hue for sunny', () => {
    const result = getWeatherTintColor(0, 75, false)
    expect(result).toMatch(/^rgba\(254,220,100,/)
  })

  it('returns rgba string with blue hue for rain', () => {
    const result = getWeatherTintColor(61, 60, false)
    expect(result).toMatch(/^rgba\(150,190,250,/)
  })

  it('returns higher alpha for hotter temperatures', () => {
    const cool = getWeatherTintColor(0, 40, false)
    const hot = getWeatherTintColor(0, 95, false)
    const coolAlpha = parseFloat(cool.split(',')[3])
    const hotAlpha = parseFloat(hot.split(',')[3])
    expect(hotAlpha).toBeGreaterThan(coolAlpha)
  })

  it('returns lower alpha for past dates', () => {
    const current = getWeatherTintColor(0, 75, false)
    const past = getWeatherTintColor(0, 75, true)
    const currentAlpha = parseFloat(current.split(',')[3])
    const pastAlpha = parseFloat(past.split(',')[3])
    expect(pastAlpha).toBeLessThan(currentAlpha)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd frontend && npx vitest run src/utils/tests/weather.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/tests/weather.test.ts
git commit -m "test: add weather utility tests"
```

---

### Task 9: Home Page Route + Navigation Changes

**Files:**
- Modify: `frontend/src/routes.ts`
- Modify: `frontend/src/shared/bottom-nav/bottom-nav.tsx`
- Modify: `frontend/src/app.tsx`
- Create: `frontend/src/pages/home/home-page.tsx` (placeholder)

- [ ] **Step 1: Add HOME route constant**

In `frontend/src/routes.ts`, add:

```typescript
HOME: '/home',
```

Add it as the first entry in the `ROUTES` object, before `LOGIN`.

- [ ] **Step 2: Create placeholder Home page**

Create `frontend/src/pages/home/home-page.tsx`:

```typescript
import { PageHeader } from '@/shared/page-header'

export const HomePage = () => {
  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Home</PageHeader>
    </div>
  )
}
```

- [ ] **Step 3: Add Home tab to bottom nav**

In `frontend/src/shared/bottom-nav/bottom-nav.tsx`:

Add `House` to the Lucide import:

```typescript
import { House, ShoppingCart, Package, Users, Settings } from 'lucide-react'
```

Add Home as the first entry in the `tabs` array:

```typescript
{ path: ROUTES.HOME, label: 'Home', icon: House },
```

Add `ROUTES.HOME` to the import if not already imported.

- [ ] **Step 4: Add Home route to app.tsx**

In `frontend/src/app.tsx`:

Import `HomePage`:

```typescript
import { HomePage } from '@/pages/home/home-page'
```

Add the route inside the `ProtectedRoute` wrapper, before the Shopping route:

```tsx
<Route path={ROUTES.HOME} element={<HomePage />} />
```

Update the root redirect from `ROUTES.SHOPPING` to `ROUTES.HOME`:

```tsx
<Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />
```

- [ ] **Step 5: Run TypeScript check + lint**

```bash
cd frontend && npx tsc -b --noEmit && npx eslint src/
```

Expected: Clean.

- [ ] **Step 6: Run all tests to check for regressions**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass. Some tests may need the root redirect updated if they assert on `/shopping`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: add Home page route and navigation tab"
```

---

### Task 10: Greeting Card Component

**Files:**
- Create: `frontend/src/pages/home/components/greeting-card.tsx`
- Modify: `frontend/src/pages/home/home-page.tsx`
- Modify: `frontend/src/pages/shopping/shopping-page.tsx`

- [ ] **Step 1: Create greeting card component**

Create `frontend/src/pages/home/components/greeting-card.tsx`:

```typescript
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

  if (!user?.name) return null

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
```

- [ ] **Step 2: Wire greeting card into Home page**

Update `frontend/src/pages/home/home-page.tsx`:

```typescript
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
```

Weather props will be wired up in a later task. For now, the greeting shows without weather.

- [ ] **Step 3: Remove greeting from Shopping page**

In `frontend/src/pages/shopping/shopping-page.tsx`, remove the greeting panel JSX block (the `{user?.name && (...)}` block with the navy gradient). Also remove the `getGreeting` import and `greeting` variable if they become unused.

- [ ] **Step 4: Run TypeScript check + tests**

```bash
cd frontend && npx tsc -b --noEmit && npx vitest run
```

Expected: All tests pass. Shopping page tests may need updating if they asserted on the greeting text.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add greeting card component, remove greeting from shopping page"
```

---

### Task 11: Trip Calendar Component

**Files:**
- Create: `frontend/src/pages/home/components/trip-calendar.tsx`
- Modify: `frontend/src/pages/home/home-page.tsx`

- [ ] **Step 1: Create trip calendar component**

Create `frontend/src/pages/home/components/trip-calendar.tsx`:

This is the largest component. It should:

- Accept props: `trips: Trip[]`, `weatherByDate: WeatherByDate` (from merged historical + forecast), `onDayClick: (date: DateOnly) => void`
- Manage state: `currentMonth` (Date) for month navigation
- Render: month/year header with left/right arrows, 7-column grid with day headers (S M T W T F S), date cells with weather tints and trip dots, legend
- Compute: which dates are past/today/future, overflow dates from adjacent months
- Use `getWeatherTintColor()` for cell backgrounds
- Show teal dots for completed trips, amber dots for planned trips on the trip's `tripDate`

Key implementation details:
- Use `Date` arithmetic to compute first day of month, number of days, leading/trailing days
- Today comparison uses `toISOString().slice(0, 10)` or `DateOnly` string format `YYYY-MM-DD`
- Trip grouping: create a `Map<string, Trip[]>` keyed by `tripDate`
- Each cell is a button that calls `onDayClick` with the date string

- [ ] **Step 2: Wire calendar into Home page**

Update `frontend/src/pages/home/home-page.tsx` to import and render `TripCalendar` below the greeting card, passing trips from `useTripsQuery()` and empty weather data for now:

```typescript
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'

import { GreetingCard } from './components/greeting-card'
import { TripCalendar } from './components/trip-calendar'

export const HomePage = () => {
  const { data: trips = [] } = useTripsQuery()

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

        <TripCalendar
          trips={trips}
          weatherByDate={{}}
          onDayClick={() => {}}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/home/
git commit -m "feat: add trip calendar component with weather tints and trip dots"
```

---

### Task 12: Calendar Day Popover

**Files:**
- Create: `frontend/src/pages/home/components/calendar-day-popover.tsx`
- Modify: `frontend/src/pages/home/home-page.tsx`

- [ ] **Step 1: Create day popover component**

Create `frontend/src/pages/home/components/calendar-day-popover.tsx`:

This component should:

- Accept props: `date: string`, `trips: Trip[]`, `weather: DailyWeather | null`, `onClose: () => void`, `onViewTrip: (tripId: string) => void`, `onPlanTrip: (date: string) => void`
- Render: header with formatted date + weather info, list of trips for that day (each tappable), "Plan a trip" / "Plan another trip" button at bottom
- Trip rows show: cart icon (teal=completed, amber=planned), trip name, status label
- Close on backdrop click or Escape key

- [ ] **Step 2: Wire popover into Home page**

Update `frontend/src/pages/home/home-page.tsx`:

- Add state: `selectedDate: string | null`
- Pass `onDayClick` to `TripCalendar` that sets `selectedDate`
- Render `CalendarDayPopover` when `selectedDate` is set
- `onViewTrip` navigates to trip detail page
- `onPlanTrip` navigates to trip creation (or opens create form) with `tripDate` pre-filled

- [ ] **Step 3: Run TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/home/
git commit -m "feat: add calendar day popover with trip list and plan action"
```

---

### Task 13: Wire Up Weather Data to Home Page

**Files:**
- Modify: `frontend/src/pages/home/home-page.tsx`

- [ ] **Step 1: Connect weather hooks and user preferences to Home page**

Update `frontend/src/pages/home/home-page.tsx` to:

- Fetch user preferences via `useUserPreferencesQuery()`
- Extract latitude/longitude from preferences
- Compute `startDate` (1 month ago) and `endDate` (yesterday) for historical weather
- Call `useHistoricalWeatherQuery()` and `useForecastWeatherQuery()` with location coords
- Merge historical + forecast into a single `weatherByDate` object
- Extract today's weather for the greeting card props
- Pass merged weather to `TripCalendar`
- Pass current weather to `GreetingCard`

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/home/home-page.tsx
git commit -m "feat: wire weather data and user preferences into home page"
```

---

### Task 14: Settings — Default Page + Location

**Files:**
- Create: `frontend/src/pages/settings/components/preferences-section.tsx`
- Modify: `frontend/src/pages/settings/settings-page.tsx`

- [ ] **Step 1: Create preferences section component**

Create `frontend/src/pages/settings/components/preferences-section.tsx`:

This component should:

- Fetch current preferences via `useUserPreferencesQuery()`
- Use `useUpdateUserPreferencesMutation()` to save changes
- **Default page setting:** Radio group or select with options: Home, Shopping, Pantry, Household
- **Location setting:**
  - Display current location name if set
  - "Use my location" button that calls `navigator.geolocation.getCurrentPosition()`, then reverse geocodes via Open-Meteo, then saves via mutation
  - Manual city/zip text input as fallback, geocodes via `https://geocoding-api.open-meteo.com/v1/search?name=...` on submit
  - "Clear location" button to remove location data

- [ ] **Step 2: Add preferences section to Settings page**

In `frontend/src/pages/settings/settings-page.tsx`, import and render `PreferencesSection` between the profile section and security section.

- [ ] **Step 3: Run TypeScript check + lint**

```bash
cd frontend && npx tsc -b --noEmit && npx eslint src/
```

Expected: Clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/settings/
git commit -m "feat: add default page and location settings"
```

---

### Task 15: Login Flow — Respect Default Page Preference

**Files:**
- Modify: `frontend/src/pages/login/login-page.tsx`
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Update login to fetch and use default page**

In `frontend/src/pages/login/login-page.tsx`:

After successful login and `setAuth()`, fetch user preferences and navigate to their `defaultPage` if set, otherwise navigate to `ROUTES.HOME`:

```typescript
const prefsResponse = await apiFetch('/api/v1/user/preferences')
const prefs = await prefsResponse.json()
navigate(prefs.defaultPage || ROUTES.HOME)
```

Import `apiFetch` and `ROUTES` as needed.

- [ ] **Step 2: Update root redirect in app.tsx**

The root `/` redirect already points to `ROUTES.HOME` from Task 9. Verify this is still the case. The root redirect serves as the fallback for unauthenticated users — after login, the user is sent to their preference.

- [ ] **Step 3: Run TypeScript check + tests**

```bash
cd frontend && npx tsc -b --noEmit && npx vitest run
```

Expected: All tests pass. Login page tests may need updating to account for the preferences fetch.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: login navigates to user's default page preference"
```

---

### Task 16: Home Page + Calendar Tests

**Files:**
- Create: `frontend/src/pages/home/tests/home-page.test.tsx`
- Create: `frontend/src/pages/home/components/tests/greeting-card.test.tsx`
- Create: `frontend/src/pages/home/components/tests/trip-calendar.test.tsx`
- Create: `frontend/src/pages/home/components/tests/calendar-day-popover.test.tsx`

- [ ] **Step 1: Write greeting card tests**

Test:
- Renders greeting with user name
- Renders nothing when no user name
- Shows location when provided
- Shows weather when provided
- Shows greeting without weather/location when those are null

- [ ] **Step 2: Run greeting card tests**

```bash
cd frontend && npx vitest run src/pages/home/components/tests/greeting-card.test.tsx
```

Expected: All pass.

- [ ] **Step 3: Write trip calendar tests**

Test:
- Renders current month and year
- Navigates to next/previous month
- Shows trip dots for trips with matching tripDate
- Applies weather tint colors when weather data provided
- Calls onDayClick when a day is tapped
- Highlights today
- Dims past dates

- [ ] **Step 4: Run calendar tests**

```bash
cd frontend && npx vitest run src/pages/home/components/tests/trip-calendar.test.tsx
```

Expected: All pass.

- [ ] **Step 5: Write day popover tests**

Test:
- Shows date and weather info in header
- Lists trips for the selected day
- Shows "Plan a trip" when no trips exist
- Shows "Plan another trip" when trips exist
- Calls onViewTrip when a trip is tapped
- Calls onPlanTrip when plan button is tapped
- Calls onClose on backdrop click

- [ ] **Step 6: Run popover tests**

```bash
cd frontend && npx vitest run src/pages/home/components/tests/calendar-day-popover.test.tsx
```

Expected: All pass.

- [ ] **Step 7: Write home page integration test**

Test:
- Renders greeting card and calendar
- Shows loading state while trips load

- [ ] **Step 8: Run all home page tests**

```bash
cd frontend && npx vitest run src/pages/home/
```

Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/home/
git commit -m "test: add home page, greeting card, trip calendar, and day popover tests"
```

---

### Task 17: Settings Tests + Bottom Nav Tests Update

**Files:**
- Create: `frontend/src/pages/settings/components/tests/preferences-section.test.tsx`
- Modify: `frontend/src/shared/bottom-nav/bottom-nav.test.tsx`

- [ ] **Step 1: Write preferences section tests**

Test:
- Renders default page options
- Selects current default page from preferences
- Calls mutation on default page change
- Shows current location name
- Calls geolocation API on "Use my location" click
- Shows manual location input
- Clears location on "Clear" click

- [ ] **Step 2: Run settings tests**

```bash
cd frontend && npx vitest run src/pages/settings/components/tests/preferences-section.test.tsx
```

Expected: All pass.

- [ ] **Step 3: Update bottom nav tests**

In `frontend/src/shared/bottom-nav/bottom-nav.test.tsx`, update existing tests to account for the new Home tab (5 tabs instead of 4). Add a test that verifies the Home tab exists and links to `/home`.

- [ ] **Step 4: Run bottom nav tests**

```bash
cd frontend && npx vitest run src/shared/bottom-nav/bottom-nav.test.tsx
```

Expected: All pass.

- [ ] **Step 5: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "test: add preferences section tests and update bottom nav tests"
```

---

### Task 18: Final Verification + STATUS.md Update

**Files:**
- Modify: `.claude/STATUS.md`

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && dotnet test
```

Expected: All tests pass.

- [ ] **Step 2: Run full frontend verification**

```bash
cd frontend && npx tsc -b --noEmit && npx eslint src/ && npx vitest run
```

Expected: tsc clean, eslint clean, all tests pass.

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Update STATUS.md**

Move "Home Page" from Planned to In Progress (or Completed if all work is done). Update test counts. Add the planning doc link.

- [ ] **Step 5: Commit**

```bash
git add .claude/STATUS.md
git commit -m "docs: update STATUS.md with home page progress"
```
