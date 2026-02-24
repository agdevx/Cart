# Cart Project Notes

## Project Status
- **Backend**: Complete with 134 tests passing
- **Frontend PWA**: Complete with 149 tests passing (37 test files)
- **Full-stack integration**: Frontend connected to backend via Vite proxy and cookie auth
- **Docker/Deployment**: Planned but not started

## Project Structure (Monorepo)
```
AGDevX.Cart/
├── backend/                          # All .NET API code
│   ├── AGDevX.Cart.slnx             # Solution file is inside backend/
│   ├── AGDevX.Cart.Api/             # Controllers, Program.cs, API layer
│   ├── AGDevX.Cart.Api.Tests/       # Controller tests (89 tests)
│   ├── AGDevX.Cart.Services/        # Business logic
│   ├── AGDevX.Cart.Services.Tests/  # Service tests (33 tests)
│   ├── AGDevX.Cart.Auth/            # Authentication (BCrypt password hashing)
│   ├── AGDevX.Cart.Auth.Tests/      # Auth tests (4 tests)
│   ├── AGDevX.Cart.Data/            # EF Core, DbContext, models, repositories
│   ├── AGDevX.Cart.Data.Tests/      # Data layer tests (8 tests)
│   └── AGDevX.Cart.Shared/          # DTOs, configuration
├── frontend/                         # React 19 PWA
│   ├── src/
│   │   ├── apis/                    # API client (TanStack Query hooks)
│   │   ├── auth/                    # Auth provider + useAuth hook
│   │   ├── features/                # Feature components (bottom-nav, PWA install)
│   │   ├── hooks/                   # Custom hooks (useSSE)
│   │   ├── libs/                    # Third-party wrappers (SSE client)
│   │   ├── pages/                   # Page components
│   │   ├── state/                   # Jotai atoms (auth, household)
│   │   └── utilities/               # Helpers (error messages, test setup)
│   ├── e2e/                         # Playwright E2E tests (mocked API)
│   ├── e2e-integration/             # Integration tests (real backend)
│   └── public/                      # Static assets + PWA icons
├── docs/
│   ├── DEVELOPMENT.md               # Full development guide
│   └── plans/                       # Design & implementation plans
└── README.md
```

## Tech Stack
- **Backend**: .NET 10, ASP.NET Core, Entity Framework Core, SQLite, System.Reactive, BCrypt
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, TanStack Query, Jotai, React Router v7, Lucide Icons, PWA
- **Auth**: Cookie-based (ASP.NET `CookieAuthentication`, `credentials: 'include'`)
- **Testing**: xUnit + Moq + FluentAssertions (backend), Vitest + React Testing Library (frontend unit), Playwright (E2E + integration)
- **Deployment**: Docker + Caddy (planned)
- **Real-time**: Server-Sent Events (SSE) with System.Reactive

## Authentication Architecture

Cookie-based authentication (migrated from JWT on 2026-02-22):
- Backend: `CookieAuthenticationDefaults.AuthenticationScheme` in Program.cs
- Cookie: `.Cart.Auth` (HttpOnly, SameSite=Lax, SlidingExpiration, 30min timeout)
- Endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Frontend: `credentials: 'include'` on all fetch calls via `apiFetch()` wrapper
- Session restoration: AuthProvider calls `GET /api/auth/me` on mount, localStorage used for optimistic initial render
- No JWT tokens, no Bearer headers, no authTokenAtom

## Implementation History

### Phase 1-6: Backend MVP — COMPLETE (2026-01-25)
- Database models, DbContext, EF Core migrations
- Repository + Service + Controller layers
- JWT authentication (later migrated to cookies)
- All CRUD endpoints: Household, Inventory, Store, Trip, TripItem
- SSE infrastructure with System.Reactive

### Phase 7-8: Frontend PWA — COMPLETE (2026-01-31)
- React 19 + Vite + TailwindCSS foundation
- Bottom navigation (mobile-first design)
- Login flow (email/password)
- Household management (create/join)
- Inventory management (personal + household items)
- Shopping trip workflow (draft → active → completed)
- Real-time collaboration via SSE
- PWA features (installable, service worker, manifest)
- Plans: `2026-01-31-frontend-pwa-design.md`, `2026-01-31-frontend-pwa-implementation.md`

### Registration Page — COMPLETE (2026-02-15)
- Registration form with email, password (with requirements checklist), display name
- Inline validation (email format, password strength, required fields)
- Auto-login after successful registration
- Bidirectional navigation between login/register pages
- Plans: `2026-02-15-registration-page-design.md`, `2026-02-15-registration-page-implementation.md`

### Cookie Auth Migration — COMPLETE (2026-02-22)
- Replaced JWT Bearer tokens with ASP.NET cookie authentication
- Simplified AuthService (removed token generation, refresh tokens)
- AuthResponse returns only userId/email/displayName (no tokens)
- Frontend: removed all Bearer header injection, switched to `credentials: 'include'`
- Removed authTokenAtom, simplified useAuth hook (no token property)
- useSSE no longer takes a token parameter
- Added Vite proxy (`/api` → `http://localhost:5000`)
- Plans: `2026-02-22-cookie-auth-migration-design.md`, `2026-02-22-cookie-auth-migration-plan.md`

### Household Management — COMPLETE (2026-02-22)
- InviteCode property on Household model (6-char alphanumeric, unique index)
- Join household via invite code (`POST /api/households/join`)
- Member list with roles (`GET /api/household/{id}/members`)
- Remove member / leave household (`DELETE /api/household/{id}/members/{userId}`)
- Transfer ownership (`PUT /api/household/{id}/owner`)
- Regenerate invite code (`POST /api/household/{id}/invite-code`)
- Household detail page with full member management UI
- Plans: `2026-02-22-household-management-design.md`, `2026-02-22-household-management-plan.md`

### Database Migrations
1. `20260125170616_InitialCreate` — Full schema (Users, Households, HouseholdMembers, Stores, Trips, InventoryItems, TripCollaborators, TripItems)
2. `20260222165648_AddHouseholdInviteCode` — InviteCode column + unique index + backfill
3. `20260223032152_RemoveCreatedByUserId` — Removed CreatedByUserId FK from Trips

## Frontend Routes
```
/login                       → LoginPage (public)
/register                    → RegisterPage (public)
/shopping                    → ShoppingPage (protected, default redirect)
/shopping/:tripId            → TripDetailPage (protected)
/shopping/:tripId/active     → ActiveTripPage (protected)
/inventory                   → InventoryPage (protected)
/inventory/add               → AddInventoryItemPage (protected)
/household                   → HouseholdPage (protected)
/household/create            → CreateHouseholdPage (protected)
/household/join              → JoinHouseholdPage (protected)
/household/:id               → HouseholdDetailPage (protected)
/                            → redirects to /shopping
```

## What's Ready
- Full REST API with cookie-based authentication
- Complete frontend PWA connected to backend
- User registration and login (email + password)
- Household management with invite codes and member management
- Inventory management (personal + household items)
- Shopping trip workflow
- Real-time updates via SSE
- Vite proxy for same-origin API calls in development
- Comprehensive test suites (134 backend + 149 frontend unit/integration)
- E2E tests (mocked API) and integration tests (real backend)

## What's NOT Ready
- Docker deployment (Phase 9 plan exists: `2026-01-25-phase9-docker-deployment.md`)
- Production configuration
- Store management UI (backend endpoints exist, no frontend pages)

## Running the Project

### Backend
```bash
cd backend
dotnet run --project AGDevX.Cart.Api
# API at http://localhost:5000
# Scalar API docs at http://localhost:5000/scalar/v1
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend at http://localhost:5173 (auto-proxies /api to backend)
```

### Tests
```bash
# Backend (134 tests)
cd backend
dotnet test

# Frontend unit/integration (149 tests)
cd frontend
npm test

# Frontend E2E (mocked API)
cd frontend
npm run test:e2e

# Frontend integration (real backend — starts both automatically)
cd frontend
npm run test:integration
```

## Items to Address Later

### Deployment
- [ ] Docker multi-stage build for backend
- [ ] Frontend production build + static serving
- [ ] Caddy reverse proxy configuration
- [ ] Docker Compose orchestration

### Future Enhancements
- [ ] Store management pages in frontend
- [ ] Camera/barcode scanning for inventory items
- [ ] Category support for inventory
- [ ] Quantity tracking for trip items
- [ ] Multiple stores per household
- [ ] User profile management
- [ ] Auth0 migration (from cookie auth to OAuth)
