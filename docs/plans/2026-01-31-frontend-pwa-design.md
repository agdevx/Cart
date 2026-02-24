# Frontend PWA Design

**Date:** 2026-01-31
**Status:** COMPLETED (2026-01-31)
**Author:** Claude & August

## Overview

A Progressive Web App (PWA) frontend for the AGDevX Cart grocery shopping application. Mobile-first design with real-time collaboration, offline support, and seamless household/personal inventory management.

### Key Goals
- Mobile-first PWA experience optimized for shopping
- Real-time collaboration with instant silent updates
- Simple username-only authentication (MVP)
- View-only offline mode with cached data
- Clean separation of household and personal inventory
- Pre-plan shopping trips before heading to store

### Non-Goals (MVP)
- Barcode/camera scanning (future enhancement)
- Recipe integration
- Price tracking
- Complex categorization
- Push notifications

## Tech Stack

- **Framework:** React 19
- **Language:** TypeScript (strict mode)
- **Build Tool:** Vite (with multi-env configs: local, dev, prod)
- **Styling:** TailwindCSS
- **Routing:** React Router
- **Server State:** Tanstack Query (React Query)
- **Global State:** Jotai (minimal - auth, household context)
- **Real-time:** EventSource API (SSE)
- **Testing:** Vitest + React Testing Library + Playwright
- **Package Manager:** npm

## Project Structure

```
frontend/
├── .claude/
│   └── CLAUDE.md
├── .scripts/
│   ├── init.ts
│   ├── prebuild.ts
│   └── postbuild.ts
├── src/
│   ├── apis/
│   │   ├── tanstack-query/
│   │   │   └── query-client.ts        # Query client config
│   │   └── agdevx-cart-api/           # Backend API client
│   │       ├── agdevx-cart-api-config.ts  # API URL, base fetch wrapper
│   │       ├── models/                # DTOs matching backend
│   │       │   ├── user.ts
│   │       │   ├── household.ts
│   │       │   ├── store.ts
│   │       │   ├── inventory-item.ts
│   │       │   ├── trip.ts
│   │       │   └── trip-item.ts
│   │       ├── auth/                  # Auth queries/mutations
│   │       │   ├── login.mutation.ts
│   │       │   └── logout.mutation.ts
│   │       ├── household/             # Household queries/mutations
│   │       │   ├── use-households.query.ts
│   │       │   ├── use-household.query.ts
│   │       │   ├── create-household.mutation.ts
│   │       │   ├── join-household.mutation.ts
│   │       │   └── invite-member.mutation.ts
│   │       ├── store/                 # Store queries/mutations
│   │       │   ├── use-stores.query.ts
│   │       │   ├── create-store.mutation.ts
│   │       │   ├── update-store.mutation.ts
│   │       │   └── delete-store.mutation.ts
│   │       ├── inventory/             # Inventory queries/mutations
│   │       │   ├── use-inventory.query.ts
│   │       │   ├── create-inventory-item.mutation.ts
│   │       │   ├── update-inventory-item.mutation.ts
│   │       │   └── delete-inventory-item.mutation.ts
│   │       └── trip/                  # Trip queries/mutations
│   │           ├── use-trips.query.ts
│   │           ├── use-trip.query.ts
│   │           ├── create-trip.mutation.ts
│   │           ├── update-trip.mutation.ts
│   │           ├── complete-trip.mutation.ts
│   │           ├── add-trip-item.mutation.ts
│   │           ├── update-trip-item.mutation.ts
│   │           ├── delete-trip-item.mutation.ts
│   │           └── check-trip-item.mutation.ts
│   ├── auth/
│   │   ├── auth-provider.tsx          # Auth context provider
│   │   └── use-auth.ts                # useAuth hook
│   ├── config/
│   │   └── app-config.ts              # General app config
│   ├── features/                      # Reusable feature components
│   │   ├── inventory-list/
│   │   ├── trip-item-card/
│   │   └── household-selector/
│   ├── libs/
│   │   └── sse-client.ts              # SSE wrapper for EventSource
│   ├── models/                        # General TypeScript types
│   │   └── common-types.ts
│   ├── pages/                         # Page components
│   │   ├── login-page.tsx
│   │   ├── inventory-page.tsx
│   │   ├── add-inventory-item-page.tsx
│   │   ├── shopping-page.tsx
│   │   ├── create-trip-page.tsx
│   │   ├── trip-detail-page.tsx
│   │   ├── active-trip-page.tsx
│   │   ├── household-page.tsx
│   │   ├── create-household-page.tsx
│   │   ├── join-household-page.tsx
│   │   └── household-settings-page.tsx
│   ├── services/                      # Business logic
│   │   └── trip-service.ts
│   ├── state/                         # Jotai atoms
│   │   ├── auth-atoms.ts
│   │   └── household-atoms.ts
│   ├── styles/
│   │   └── globals.css                # Global styles, Tailwind imports
│   ├── utilities/
│   │   ├── error-messages.ts          # Error code → message dictionary
│   │   └── formatters.ts
│   ├── app.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   └── e2e/                           # Playwright E2E tests
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── eslint.config.js                   # Base ESLint config
├── eslint.config.local.js             # Local dev (allows debugger)
├── eslint.config.commit.js            # Pre-commit (strict)
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── README.md
├── tsconfig.json                      # TypeScript config for src
├── tsconfig.node.json                 # TypeScript config for Node scripts
├── vite.config.ts                     # Base Vite config
├── vite.config.local.ts               # Local dev config
├── vite.config.dev.ts                 # Dev environment
└── vite.config.prod.ts                # Production config
```

### Path Aliases

All configured in `tsconfig.json` and `vite.config.ts`:
- `@/apis/*` → `src/apis/*`
- `@/auth/*` → `src/auth/*`
- `@/config/*` → `src/config/*`
- `@/features/*` → `src/features/*`
- `@/libs/*` → `src/libs/*`
- `@/models/*` → `src/models/*`
- `@/pages/*` → `src/pages/*`
- `@/services/*` → `src/services/*`
- `@/state/*` → `src/state/*`
- `@/styles/*` → `src/styles/*`
- `@/utilities/*` → `src/utilities/*`

### Naming Conventions

- **All files and folders:** kebab-case (e.g., `inventory-item.ts`, `use-auth.ts`)
- **React components:** PascalCase in code, kebab-case filenames (e.g., `LoginPage` in `login-page.tsx`)
- **Hooks:** camelCase starting with "use" (e.g., `useAuth`, `useInventory`)
- **Constants:** SCREAMING_SNAKE_CASE

## Navigation & Routing

### Bottom Tab Navigation

Three main tabs for mobile-first experience:
1. **Inventory** - Manage household and personal items
2. **Shopping** - Active trips and trip history
3. **Household** - Household switcher, settings, members

### Route Structure

```
/login                          # Username-only auth
/                               # Redirects to /shopping (default after login)

# Inventory Tab
/inventory                      # Inventory list (household + personal)
/inventory/add                  # Add new inventory item

# Shopping Tab
/shopping                       # Trip list (active trip card + history)
/shopping/create                # Create new trip (draft state)
/shopping/:tripId               # Trip detail (add items, planning)
/shopping/:tripId/active        # Active shopping view (grouped by store)

# Household Tab
/household                      # Household selector & settings
/household/create               # Create new household
/household/join                 # Join household via invite code
/household/:id/settings         # Manage members, stores, invites
```

### Navigation Behavior

- Unauthenticated users → `/login`
- Authenticated users default to `/shopping`
- Bottom tabs always visible (except on `/login`)
- Deep links work for sharing trips within household
- Browser back button supported throughout
- Lazy-load route components for smaller initial bundle
- Protected routes check authentication
- Household context preserved in URL when relevant

## Page Components

### Authentication Pages

**LoginPage** (`/login`)
- Simple form with username input only
- Submit → backend issues JWT → redirect to `/shopping`
- Backend creates user if username doesn't exist (MVP behavior)

### Inventory Tab Pages

**InventoryPage** (`/inventory`)
- Displays merged list of household items (if in household) + personal items
- Each item shows: name, default store (if set), badge ("Household" or "Personal")
- Floating "Add Item" button (bottom-right FAB)
- Search/filter capability
- Tap item to edit

**AddInventoryItemPage** (`/inventory/add`)
- Form fields:
  - Item name (required)
  - Default store (optional dropdown)
  - Scope selector (Household/Personal - only shows Household if user belongs to one)
  - Notes field (optional)
- Submit → creates item → back to inventory list

### Shopping Tab Pages

**ShoppingPage** (`/shopping`)
- **If active trip exists:** Large "Continue Shopping at [Store]" card at top
- **If no active trip:** Prominent "Start Shopping Trip" button
- Below: List of recent completed trips
- Contextual UI adapts based on active trip state

**CreateTripPage** (`/shopping/create`)
- Select household context (or Personal if no household)
- Creates trip in Draft state
- Redirects to TripDetailPage

**TripDetailPage** (`/shopping/:tripId`)
- **Planning mode** (Draft state)
- Top section: Current trip items list with quantities
- Bottom section: Browsable inventory (household + personal)
- Each inventory item has "Add to Trip" button
- Tap → modal for quantity input → adds to trip
- "Start Trip" button at bottom → changes trip to Active state → redirects to ActiveTripPage

**ActiveTripPage** (`/shopping/:tripId/active`)
- Items grouped by store (collapsible sections)
- Checkboxes for each item
- Real-time updates via SSE (instant silent updates)
- Fully editable: can still add/remove items, change stores
- "Complete Trip" button → marks trip completed → redirects to shopping list

### Household Tab Pages

**HouseholdPage** (`/household`)
- **If user has no households:** "Create Household" and "Join Household" buttons
- **If user has household(s):**
  - Household selector dropdown (if multiple)
  - Current household details: members list, stores list
  - Links to create/join more, settings

**CreateHouseholdPage** (`/household/create`)
- Form: household name (required)
- Submit → creates household → shows invite code for sharing

**JoinHouseholdPage** (`/household/join`)
- Form: invite code input
- Submit → joins household → redirects to household page

**HouseholdSettingsPage** (`/household/:id/settings`)
- Manage members (view, remove)
- Manage stores (add, edit, delete)
- View/regenerate invite code
- Leave household option

## State Management

### Jotai Atoms (Global State)

Minimal global state in `src/state/`:

**auth-atoms.ts**
```typescript
export const currentUserAtom = atom<User | null>(null);
export const authTokenAtom = atom<string | null>(null);
```

**household-atoms.ts**
```typescript
export const selectedHouseholdIdAtom = atom<string | null>(null);
// Persisted to localStorage for context preservation
```

### Tanstack Query (Server State)

Server state managed by queries/mutations in `apis/agdevx-cart-api/`:
- Household list, inventory items, stores, trips - all cached by Tanstack Query
- Query keys structured: `['households']`, `['inventory', householdId]`, `['trip', tripId]`
- Automatic cache invalidation on mutations
- Stale-while-revalidate strategy for smooth UX
- Optimistic updates for instant feedback

### React Local State

Component-level `useState` for:
- Form inputs
- UI toggles (modals, dropdowns)
- Temporary selections (items being added to trip)

### State Management Philosophy

- **Jotai:** Minimal global state (auth, household context)
- **Tanstack Query:** All server state (caching, refetching, optimistic updates)
- **Local state:** Component UI state (no over-engineering)

## Real-Time Updates (SSE)

### SSE Integration

When a user opens an active trip (`ActiveTripPage`), establish SSE connection for real-time collaboration.

**Implementation:**

```typescript
// src/libs/sse-client.ts
// Wrapper around EventSource API
// Connects to GET /api/trips/{tripId}/events
// Includes auth token in request
// Auto-reconnects on connection drop (built into EventSource)
```

**Event Handling in ActiveTripPage:**

1. Component mounts → establish SSE connection
2. Listen for events: `item-checked`, `item-added`, `item-removed`, `trip-completed`
3. On event received → invalidate Tanstack Query cache for this trip
4. Query refetches → UI updates instantly and silently
5. Component unmounts → close SSE connection

**Event Types from Backend:**

- `item-checked` - Someone checked/unchecked an item
- `item-added` - Someone added item to trip
- `item-removed` - Someone removed item from trip
- `trip-completed` - Someone marked trip as complete

**User Experience:**

- Alice checks off "Milk" → Backend broadcasts event → Bob's trip view refetches → Bob sees "Milk" checked off
- No toasts, no notifications, just instant silent updates
- Checked items stay visible but marked as complete
- If SSE disconnects, EventSource auto-reconnects and query refetches current state

**Privacy:**

- Personal inventory items on shared trips only visible to their owner
- SSE events trigger refetch, backend filters items per user

## Authentication Flow

### Simple Username-Only Auth (MVP)

**Login Process:**

1. User enters username on `/login` page
2. Submit → `POST /api/auth/login { username }`
3. Backend issues JWT token (creates user if doesn't exist)
4. Frontend stores token in:
   - `authTokenAtom` (Jotai - in-memory)
   - `localStorage` (persists across page refreshes)
5. Fetch user info, store in `currentUserAtom`
6. Redirect to `/shopping`

**Auth Provider:**

```typescript
// src/auth/auth-provider.tsx
// Wraps entire app
// On mount: check localStorage for token
// If token exists: validate with backend, restore session
// If invalid/missing: redirect to /login
// Provides context for useAuth() hook
```

**useAuth Hook:**

```typescript
// src/auth/use-auth.ts
export const useAuth = () => {
  const [user] = useAtom(currentUserAtom);
  const [token] = useAtom(authTokenAtom);

  const login = async (username: string): Promise<void> => {
    // Call login mutation, store token, fetch user
  };

  const logout = (): void => {
    // Clear atoms, localStorage, redirect to /login
  };

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token
  };
};
```

**API Request Wrapper:**

```typescript
// src/apis/agdevx-cart-api/agdevx-cart-api-config.ts
// Base fetch wrapper that adds Authorization header
// Reads token from authTokenAtom
// All queries/mutations use this wrapper
// On 401 response → clear auth, redirect to /login
```

**No Registration Flow:**

Backend creates users on-demand. If username doesn't exist, backend creates it and issues JWT.

## Data Flow Patterns

### Creating a Shopping Trip

1. User taps "Start Shopping Trip" → navigate to `/shopping/create`
2. Select household context (or Personal) → `createTrip.mutation`
3. Backend creates trip in Draft state → returns trip ID
4. Invalidate `['trips']` query → trip list updates
5. Navigate to `/shopping/:tripId` (TripDetailPage - planning mode)

### Building Trip List (Planning Phase)

1. TripDetailPage loads:
   - `useTrip.query` fetches trip details
   - `useInventory.query` fetches household + personal inventory
2. User taps "Add to Trip" on inventory item → modal for quantity
3. Submit → `addTripItem.mutation { inventoryItemId, quantity, storeId }`
4. **Optimistic update:** immediately show item in trip list
5. Backend confirms → invalidate `['trip', tripId]` query
6. If error: rollback optimistic update, show error toast

### Starting the Trip

1. User taps "Start Trip" → `updateTrip.mutation { status: 'Active' }`
2. Navigate to `/shopping/:tripId/active` (ActiveTripPage)
3. Establish SSE connection for real-time updates
4. Items displayed grouped by store

### Checking Off Items (Active Shopping)

1. User taps checkbox → `checkTripItem.mutation`
2. **Optimistic update:** item marked checked immediately
3. Backend broadcasts SSE event to all collaborators
4. Other users' SSE listeners → invalidate trip query → refetch → see updated state
5. Smooth, instant experience for all shoppers

### Offline Behavior (View-Only)

- If offline: mutations fail, show "You're offline" toast
- Previously loaded data still visible (Tanstack Query cache)
- View-only mode: can browse cached data but can't modify
- No mutation queuing (requires online connectivity)

## Error Handling

### API Error Response Format

Backend returns structured errors:

```typescript
{
  errorCode: "ITEM_NOT_FOUND" | "VALIDATION_FAILED" | "UNAUTHORIZED" | ...,
  details?: { ... },
  fields?: { fieldName: "REQUIRED" | "INVALID_NUMBER" | ... }
}
```

### Error Message Dictionary

```typescript
// src/utilities/error-messages.ts
export const ERROR_MESSAGES: Record<string, string> = {
  ITEM_NOT_FOUND: "Item not found",
  VALIDATION_FAILED: "Please check your input",
  UNAUTHORIZED: "Please log in again",
  TRIP_ALREADY_COMPLETED: "This trip is already completed",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to do that",
  DUPLICATE_EMAIL: "That email is already registered",
  DEFAULT: "Something went wrong. Please try again."
};

export const getErrorMessage = (code: string): string => {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT;
};
```

### Error Handling Strategies

**Mutation Errors (Toast Notifications):**
- Failed mutations show toast with user-friendly message
- Use error code to lookup message from dictionary
- Fall back to DEFAULT for unknown codes
- Auto-dismiss after 5 seconds
- Non-blocking, user can continue browsing

**Query Errors (Inline Display):**
- Failed queries show inline error state on page
- "Unable to load inventory. Try again?" with retry button
- Tanstack Query's `error` and `refetch` make this easy
- Prevents blank pages, gives user control

**Validation Errors (Form Feedback):**
- `VALIDATION_FAILED` responses include `fields` object
- Display errors inline below form inputs
- Map field error codes to user-friendly messages:
  - `REQUIRED` → "This field is required"
  - `INVALID_NUMBER` → "Please enter a valid number"
- Real-time validation on blur (UX improvement)

**Network Errors:**
- Offline detection: `navigator.onLine` check
- Show "You're offline" banner at top of screen
- Disable mutation buttons when offline
- Queries show stale data from cache with "Offline - showing cached data" indicator
- Auto-hide banner when back online

**Auth Errors:**
- 401 responses → clear auth state → redirect to `/login`
- Show toast: "Your session expired. Please log in again."
- Preserve attempted URL to redirect back after login

## Testing Strategy

### Unit Tests (Vitest)

**What to test:**
- Utilities and helper functions in `src/utilities/`
- Business logic in `src/services/`
- Error message dictionary mapping
- Data transformation functions

**Example:**
```typescript
// src/utilities/error-messages.test.ts
describe('getErrorMessage', () => {
  it('returns mapped message for known error code', () => {
    expect(getErrorMessage('ITEM_NOT_FOUND')).toBe('Item not found');
  });

  it('returns default message for unknown error code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('Something went wrong. Please try again.');
  });
});
```

### Component Tests (React Testing Library + Vitest)

**What to test:**
- Key feature components in `src/features/`
- Test user interactions, not implementation details
- Mock Tanstack Query hooks

**Examples:**
- **InventoryList:** renders items, "Add to Trip" button calls mutation
- **TripItemCard:** checkbox toggles checked state, shows quantity
- **LoginForm:** validates input, calls login on submit
- **HouseholdSelector:** switches household context, updates atom

**Best practices:**
- Use `screen.getByRole()` for accessibility
- Test user-visible behavior, not internal state
- Mock API calls, focus on component logic

### Integration Tests

**What to test:**
- Full page components with real query/mutation hooks
- Mock API responses using MSW (Mock Service Worker)
- Test complete user flows

**Key flows to test:**
- Create trip → add items → start trip → check items → complete trip
- Add inventory item → appears in list → add to trip
- Join household → see household inventory → household items visible to all members
- Personal items stay private on shared trips

**Error handling:**
- Network failures show appropriate messages
- Validation errors display inline
- Optimistic updates rollback on failure

### E2E Tests (Playwright)

**What to test:**
- Critical user journeys on real browser
- Multi-device testing for real-time collaboration
- PWA installation and offline behavior

**Multi-user collaboration tests:**
- Two browsers: Alice creates trip, Bob joins as collaborator
- Alice checks item, Bob sees update in real-time
- Personal items stay private between users

**Key scenarios:**
- **Complete shopping flow:** login → create trip → add items → start trip → shop → complete
- **Household collaboration:** create household → invite member → join → share trip
- **Personal vs household privacy:** add personal item → add to shared trip → verify other user can't see it
- **Offline behavior:** disconnect network → verify cached data visible → verify mutations disabled

### Test Organization

**File structure:**
- Colocate tests: `component-name.test.tsx` next to `component-name.tsx`
- E2E tests in `tests/e2e/` at project root
- Shared test utilities in `src/utilities/test-helpers.ts`

**Test execution:**
- Unit/component tests on every commit (pre-commit hook via ESLint commit config)
- Integration tests in CI/CD pipeline
- E2E tests before releases and on-demand
- Fast feedback loop: unit tests < 10s, component tests < 30s

### Test Coverage Goals

- Unit tests: 80%+ coverage for utilities/services
- Component tests: All user-facing features
- Integration tests: All critical user flows
- E2E tests: Top 3 user journeys (login → shop → complete, household creation, collaboration)

## PWA Configuration

### Service Worker

- Cache static assets (HTML, CSS, JS, images)
- Cache API responses via Tanstack Query
- Offline page when API unreachable
- Background sync not implemented (requires online connectivity for mutations)

### Web App Manifest

```json
{
  "name": "AGDevX Cart",
  "short_name": "Cart",
  "description": "Grocery shopping list with real-time collaboration",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4f46e5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Installation Prompt

- Detect if PWA installable
- Show "Add to Home Screen" banner on first visit
- Dismiss after 3 visits if not installed
- Re-show after 30 days

## Deployment & Build

### Environment Configs

**vite.config.local.ts:**
- API URL: `http://localhost:5000` (local backend)
- HTTPS via local SSL certificates
- Hot module replacement

**vite.config.dev.ts:**
- API URL: `https://cart-dev.tailscale` (dev environment)
- Source maps enabled
- Debug logging

**vite.config.prod.ts:**
- API URL: `https://cart.tailscale` (production)
- Minification, tree-shaking
- No source maps
- Service worker registration

### Build Process

1. Run tests (unit, component, integration)
2. Lint with ESLint commit config (strict)
3. Type-check with TypeScript
4. Build with Vite (appropriate config)
5. Generate service worker
6. Output to `dist/` folder

### Deployment

- Static files served by Caddy
- Docker container (multi-stage build)
- Caddy handles HTTPS, compression, caching headers
- API reverse proxy to backend container

## Future Enhancements (Post-MVP)

- Barcode scanning for inventory items
- Camera OCR for package information
- Dark mode
- Push notifications for trip updates
- Share trip summaries (total items, duration)
- Recipe integration (optional)
- Price tracking per item
- Shopping budgets per trip
- Multiple shopping lists per household
- Export trip history to CSV

## Open Questions / Decisions Needed

- PWA icon design
- Color scheme / branding
- Service worker caching strategy (cache-first vs network-first for API)
- Installation prompt timing
- Maximum trip history to display on shopping page
- Swipe gestures for checking items (nice-to-have)
