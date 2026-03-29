# AGDevX Cart

Self-hosted grocery shopping list application with real-time collaboration.

## Features

- Cookie-based authentication with email + password (BCrypt hashing)
- Session persistence across page reloads
- User profile management (name, email, password)
- Household management (create/join with invite codes, ownership transfer)
- Personal and household inventory items with filtered views (all, personal, per-household, merged)
- Store management (personal and household) with uniqueness enforcement
- Shopping trip workflow (create → start → complete → reopen → delete)
- Trip item editing (quantity, notes, store assignment) and removal
- Trip collaborators with authorization checks
- Field-level form validation across all forms
- Top-level error boundary with recovery UI
- Automatic audit fields (CreatedBy, ModifiedBy, timestamps) via EF Core SaveChanges override
- Real-time collaboration via Server-Sent Events
- Progressive Web App (installable, offline support)
- Mobile-first design with bottom navigation
- Request timeouts (30s default, SSE excluded) with CancellationToken propagation
- Rate limiting (5/min auth, 60/min general)
- Security headers (CSP, X-Frame-Options, etc.)
- Security audit logging

## Tech Stack

**Backend:**
- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- System.Reactive (for SSE)
- xUnit + Moq (testing)

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- TanStack Query (React Query)
- Jotai (state management)
- Vitest + React Testing Library (unit tests)
- Playwright (E2E tests)

## Project Structure

```
AGDevX.Cart/                          # Monorepo root
├── backend/                          # All .NET API code
│   ├── AGDevX.Cart.slnx             # Solution file
│   ├── AGDevX.Cart.Api/             # Controllers, middleware, Program.cs
│   ├── AGDevX.Cart.Api.Tests/       # Controller + middleware tests
│   ├── AGDevX.Cart.Services/        # Business logic
│   ├── AGDevX.Cart.Services.Tests/  # Service tests
│   ├── AGDevX.Cart.Auth/            # Authentication (BCrypt, cookie sessions)
│   ├── AGDevX.Cart.Auth.Tests/      # Auth tests
│   ├── AGDevX.Cart.Data/            # EF Core, DbContext, models, repositories
│   ├── AGDevX.Cart.Data.Tests/      # Data layer tests
│   └── AGDevX.Cart.Shared/          # DTOs, configuration, security
├── frontend/                         # React 19 PWA
│   ├── src/
│   │   ├── apis/                    # API client (TanStack Query hooks)
│   │   ├── auth/                    # Auth provider + useAuth hook
│   │   ├── features/                # Feature components (bottom-nav, PWA install)
│   │   ├── hooks/                   # Custom hooks (field validation, focus trap, SSE)
│   │   ├── libs/                    # SSE client
│   │   ├── pages/                   # Page components + shared UI
│   │   ├── state/                   # Jotai atoms (auth, household scope)
│   │   ├── styles/                  # globals.css (Tailwind theme, animations)
│   │   ├── utils/                   # Validation rules, helpers
│   │   └── utilities/               # Test setup, error messages
│   ├── tests/
│   │   ├── browser-tests/           # Playwright browser tests (mocked API)
│   │   └── e2e-integration-tests/   # Playwright E2E tests (real backend)
│   └── public/                      # Static assets + PWA manifest
├── deploy/                           # Server deployment templates
│   ├── caddy/                       # Shared Caddy reverse proxy
│   └── cart/                        # Cart app stack (compose + env)
├── docs/
│   ├── DEVELOPMENT.md               # Setup, running, testing guide
│   ├── active/                      # Specs and plans for in-progress or planned work
│   └── archive/                     # Specs and plans for completed enhancements
└── .claude/
    ├── CLAUDE.md                     # Project conventions and patterns
    └── STATUS.md                     # Enhancement tracking (planned / in progress / completed)
```

## Getting Started

**For complete development setup and workflow, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**

### Quick Start

1. **Backend:**
   ```bash
   cd backend
   dotnet run --project AGDevX.Cart.Api
   # API at http://localhost:5000
   ```

2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend at http://localhost:5173 (proxies /api to backend)
   ```

3. **Open browser:** Navigate to `http://localhost:5173`

### Running Tests

**Backend:**
```bash
cd backend
dotnet test
```

**Frontend:**
```bash
cd frontend
npm test                      # Vitest unit tests
npm run test:e2e              # Playwright E2E with mocks
npm run test:integration      # Integration tests with real backend
```

## API Endpoints

All endpoints use the `/api/v1/` prefix.

### Authentication
- `POST /api/v1/auth/register` - Register with email + password
- `POST /api/v1/auth/login` - Login with email + password
- `POST /api/v1/auth/logout` - Logout (clear session cookie)
- `GET /api/v1/auth/me` - Get current user info
- `PUT /api/v1/auth/profile` - Update user profile
- `PUT /api/v1/auth/password` - Change password

### Households
- `GET /api/v1/household` - List user's households
- `GET /api/v1/household/{id}` - Get household by ID
- `POST /api/v1/household` - Create household
- `PUT /api/v1/household/{id}` - Update household
- `DELETE /api/v1/household/{id}` - Delete household (owner only)
- `POST /api/v1/households/join` - Join household with invite code
- `GET /api/v1/household/{id}/members` - List members
- `DELETE /api/v1/household/{id}/members/{userId}` - Remove member
- `PUT /api/v1/household/{id}/owner` - Transfer ownership
- `GET /api/v1/household/{id}/invite-code` - Get invite code
- `POST /api/v1/household/{id}/invite-code` - Regenerate invite code

### Stores
- `GET /api/v1/store/household/{householdId}` - List household stores
- `GET /api/v1/store/personal` - List personal stores
- `GET /api/v1/store/{id}` - Get store by ID
- `POST /api/v1/store` - Create store
- `PUT /api/v1/store/{id}` - Update store
- `DELETE /api/v1/store/{id}` - Delete store

### Inventory
- `GET /api/v1/inventory` - List all inventory items
- `GET /api/v1/inventory/household/{householdId}` - List household items
- `GET /api/v1/inventory/personal` - List personal items
- `GET /api/v1/inventory/merged/{householdId}` - List merged (personal + household) items
- `GET /api/v1/inventory/{id}` - Get item by ID
- `POST /api/v1/inventory` - Create inventory item
- `PUT /api/v1/inventory/{id}` - Update inventory item
- `DELETE /api/v1/inventory/{id}` - Delete inventory item

### Trips
- `GET /api/v1/trip/user` - List user's trips
- `GET /api/v1/trip/household/{householdId}` - List household trips
- `GET /api/v1/trip/{id}` - Get trip details
- `POST /api/v1/trip` - Create trip
- `PUT /api/v1/trip/{id}` - Update trip
- `DELETE /api/v1/trip/{id}` - Delete trip (creator only)
- `POST /api/v1/trip/{id}/start` - Start trip (planning → active)
- `POST /api/v1/trip/{id}/complete` - Mark trip completed
- `POST /api/v1/trip/{id}/reopen` - Reopen completed trip
- `POST /api/v1/trip/{id}/collaborators` - Add collaborator
- `DELETE /api/v1/trip/{id}/collaborators/{userId}` - Remove collaborator

### Trip Items
- `GET /api/v1/tripitem/trip/{tripId}` - List items for a trip
- `GET /api/v1/tripitem/{id}` - Get trip item by ID
- `POST /api/v1/tripitem/trip/{tripId}` - Add item to trip
- `PUT /api/v1/tripitem/{id}` - Update trip item
- `DELETE /api/v1/tripitem/{id}` - Delete trip item
- `POST /api/v1/tripitem/{id}/check` - Check item off
- `POST /api/v1/tripitem/{id}/uncheck` - Uncheck item

### Real-Time Events
- `GET /api/v1/trips/{tripId}/events` - SSE endpoint for trip updates

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, running, testing, troubleshooting
- **[Integration Tests](frontend/tests/e2e-integration-tests/README.md)** - Full-stack integration testing
- **[Enhancement Tracking](.claude/STATUS.md)** - Planned, in progress, and completed enhancements
- **[Archive](docs/archive/)** - Design specs and implementation plans for all completed work

## Contributing

This is a personal project but follows standard practices:
- TDD workflow (test first, then implement)
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Feature branches
- Never commit directly to `main`

## License

Private project - not licensed for public use.
