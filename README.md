# AGDevX Cart

Self-hosted grocery shopping list application with real-time collaboration.

## Status

- ✅ **Backend API** - Complete with 115 tests passing
- ✅ **Frontend PWA** - Complete with 100 unit tests passing
- ✅ **Integration** - Fully connected with 9 integration tests passing (100%)
- 📋 **Docker** - Planned but not started
- 📋 **Deployment** - Planned but not started

**Latest**: Frontend-backend integration complete! Full authentication flow, CORS, session persistence, and all API operations working. See [INTEGRATION-SUMMARY.md](INTEGRATION-SUMMARY.md) for details.

## Features

### Current (Implemented)
- JWT-based authentication with email + password (BCrypt hashing)
- Session persistence across page reloads
- Household management (create/join with invite codes)
- Personal and household inventory items
- Shopping trip workflow (draft → active → completed)
- Real-time collaboration via Server-Sent Events
- Progressive Web App (installable, offline support)
- Mobile-first design with bottom navigation

### Planned (Future)
- Camera/barcode scanning for inventory items
- Category support for inventory
- Quantity tracking for trip items
- Multiple stores per household
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
│   ├── AGDevX.Cart.Services/        # Business logic
│   ├── AGDevX.Cart.Auth/            # Authentication
│   ├── AGDevX.Cart.Data/            # EF Core, DbContext
│   ├── AGDevX.Cart.Shared/          # Models, DTOs
│   └── Tests/                       # xUnit tests
├── frontend/                         # React 19 PWA
│   ├── src/
│   │   ├── apis/                    # API client code
│   │   ├── auth/                    # Auth provider
│   │   ├── features/                # Feature components
│   │   ├── hooks/                   # Custom hooks
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
   cp .env.example .env.local
   npm install
   npm run dev
   # Frontend at http://localhost:5173
   ```

3. **Open browser:** Navigate to `http://localhost:5173`

### Running Tests

**Backend (115 tests):**
```bash
cd backend
dotnet test
```

**Frontend (136+ tests):**
```bash
cd frontend
npm test                      # Vitest unit/integration (101 tests)
npm run test:e2e              # Playwright E2E with mocks (17 tests)
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
- `POST /api/auth/login` - Login with username

### Households
- `GET /api/household` - List user's households
- `POST /api/household` - Create household
- `POST /api/household/join` - Join household with invite code
- `GET /api/household/{id}/invite-code` - Get household invite code

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/{id}` - Update inventory item
- `DELETE /api/inventory/{id}` - Delete inventory item

### Trips
- `GET /api/trip` - List trips
- `GET /api/trip/{id}` - Get trip details
- `POST /api/trip` - Create trip
- `POST /api/trip/{id}/complete` - Complete trip
- `GET /api/trip/{id}/items` - List trip items
- `POST /api/trip/{id}/items` - Add item to trip
- `POST /api/tripitem/{id}/check` - Check/uncheck trip item
- `GET /api/trips/{id}/events` - SSE endpoint for real-time updates

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
