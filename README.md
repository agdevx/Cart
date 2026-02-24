# AGDevX Cart

Self-hosted grocery shopping list application with real-time collaboration.

## Status

- ✅ **Backend API** - Complete with 134 tests passing
- ✅ **Frontend PWA** - Complete with unit, E2E, and integration tests
- 📋 **Docker** - Planned but not started
- 📋 **Deployment** - Planned but not started

## Features

### Current (Implemented)
- Cookie-based authentication with email + password (BCrypt hashing)
- Session persistence across page reloads
- Household management (create/join with invite codes, ownership transfer)
- Personal and household inventory items
- Store management (personal and household)
- Shopping trip workflow (create → complete → reopen)
- Trip collaborators with authorization checks
- Automatic audit fields (CreatedBy, ModifiedBy, timestamps) via EF Core SaveChanges override
- Real-time collaboration via Server-Sent Events
- Progressive Web App (installable, offline support)
- Mobile-first design with bottom navigation

### Planned (Future)
- Camera/barcode scanning for inventory items
- Category support for inventory
- Quantity tracking for trip items
- User profile management
- Auth0 OAuth integration

## Tech Stack

**Backend:**
- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- SQLite
- System.Reactive (for SSE)
- xUnit (testing)

**Frontend:**
- React 19
- TypeScript
- Vite
- TailwindCSS
- TanStack Query (React Query)
- Jotai (state management)
- Vitest + React Testing Library (unit tests)
- Playwright (E2E tests)

**Deployment (Planned):**
- Docker + Docker Compose
- Caddy (reverse proxy)

## Project Structure

```
AGDevX.Cart/                          # Monorepo root
├── backend/                          # All .NET API code
│   ├── AGDevX.Cart.slnx             # Solution file
│   ├── AGDevX.Cart.Api/             # Controllers, Program.cs
│   ├── AGDevX.Cart.Api.Tests/       # Controller tests
│   ├── AGDevX.Cart.Services/        # Business logic
│   ├── AGDevX.Cart.Services.Tests/  # Service tests
│   ├── AGDevX.Cart.Auth/            # Authentication
│   ├── AGDevX.Cart.Auth.Tests/      # Auth tests
│   ├── AGDevX.Cart.Data/            # EF Core, DbContext, models, repositories
│   ├── AGDevX.Cart.Data.Tests/      # Data layer tests
│   └── AGDevX.Cart.Shared/          # DTOs, configuration
├── frontend/                         # React 19 PWA
│   ├── src/
│   │   ├── apis/                    # API client code
│   │   ├── auth/                    # Auth provider
│   │   ├── features/                # Feature components
│   │   ├── hooks/                   # Custom hooks
│   │   ├── libs/                    # Third-party wrappers
│   │   ├── pages/                   # Page components
│   │   ├── state/                   # Jotai atoms
│   │   └── utilities/               # Helpers
│   ├── e2e/                         # Playwright E2E tests (mocked API)
│   ├── e2e-integration/             # Integration tests (real backend)
│   └── public/                      # Static assets
├── docs/
│   └── plans/                       # Design & implementation docs
└── README.md
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

**Backend (134 tests):**
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

## Development

### Backend Development

```bash
cd backend
dotnet build                              # Build solution
dotnet test                               # Run all tests
dotnet run --project AGDevX.Cart.Api     # Run API
```

### Frontend Development

```bash
cd frontend
npm run dev          # Dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Run Vitest tests
npm run test:ui      # Vitest UI
npx playwright test  # Run E2E tests
```

### Code Quality

**Backend:**
- Follow .NET coding conventions
- All public APIs must have XML documentation
- Maintain test coverage for business logic

**Frontend:**
```bash
cd frontend
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check
```
- Follows kebab-case for files/folders
- Path aliases (@/apis, @/auth, etc.)
- ESLint with TypeScript rules
- All tests must pass before commit

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register with email + password
- `POST /api/auth/login` - Login with email + password
- `POST /api/auth/logout` - Logout (clear session cookie)
- `GET /api/auth/me` - Get current user info

### Households
- `GET /api/household` - List user's households
- `GET /api/household/{id}` - Get household by ID
- `POST /api/household` - Create household
- `PUT /api/household/{id}` - Update household
- `DELETE /api/household/{id}` - Delete household (owner only)
- `POST /api/households/join` - Join household with invite code
- `GET /api/household/{id}/members` - List members
- `DELETE /api/household/{id}/members/{userId}` - Remove member
- `PUT /api/household/{id}/owner` - Transfer ownership
- `GET /api/household/{id}/invite-code` - Get invite code
- `POST /api/household/{id}/invite-code` - Regenerate invite code

### Stores
- `GET /api/store/household/{householdId}` - List household stores
- `GET /api/store/personal` - List personal stores
- `GET /api/store/{id}` - Get store by ID
- `POST /api/store` - Create store
- `PUT /api/store/{id}` - Update store
- `DELETE /api/store/{id}` - Delete store

### Inventory
- `GET /api/inventory` - List all inventory items
- `GET /api/inventory/household/{householdId}` - List household items
- `GET /api/inventory/personal` - List personal items
- `GET /api/inventory/merged/{householdId}` - List merged (personal + household) items
- `GET /api/inventory/{id}` - Get item by ID
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/{id}` - Update inventory item
- `DELETE /api/inventory/{id}` - Delete inventory item

### Trips
- `GET /api/trip/user` - List user's trips
- `GET /api/trip/household/{householdId}` - List household trips
- `GET /api/trip/{id}` - Get trip details
- `POST /api/trip` - Create trip
- `PUT /api/trip/{id}` - Update trip
- `DELETE /api/trip/{id}` - Delete trip (creator only)
- `POST /api/trip/{id}/complete` - Mark trip completed
- `POST /api/trip/{id}/reopen` - Reopen completed trip
- `POST /api/trip/{id}/collaborators` - Add collaborator
- `DELETE /api/trip/{id}/collaborators/{userId}` - Remove collaborator

### Trip Items
- `GET /api/tripitem/trip/{tripId}` - List items for a trip
- `GET /api/tripitem/{id}` - Get trip item by ID
- `POST /api/tripitem` - Add item to trip
- `PUT /api/tripitem/{id}` - Update trip item
- `DELETE /api/tripitem/{id}` - Delete trip item
- `POST /api/tripitem/{id}/check` - Check item off
- `POST /api/tripitem/{id}/uncheck` - Uncheck item

### Real-Time Events
- `GET /api/trips/{tripId}/events` - SSE endpoint for trip updates

## Documentation

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, running, testing, troubleshooting
- **[Integration Tests](frontend/e2e-integration/README.md)** - Full-stack integration testing
- **`docs/plans/`** - Design documents and implementation plans
- **`.claude/NOTES.md`** - Project status and history

## Contributing

This is a personal project but follows standard practices:
- TDD workflow (test first, then implement)
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Feature branches prefixed with `ag/`
- Never commit directly to `main`

## License

Private project - not licensed for public use.
