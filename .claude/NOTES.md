# Cart Project Notes

## Project Status
- **Backend MVP completed**: 2026-01-25 (115 tests passing)
- **Frontend PWA completed**: 2026-01-31 (118 tests passing)
- **Current Status**: Both backend and frontend complete independently
- **Next**: Integration testing (connect frontend to backend), then Docker deployment

## Project Structure (Monorepo)
```
AGDevX.Cart/
├── backend/                          # All .NET API code
│   ├── AGDevX.Cart.slnx             # Solution file is inside backend/
│   ├── AGDevX.Cart.Api/             # Controllers, Program.cs, API layer
│   ├── AGDevX.Cart.Services/        # Business logic
│   ├── AGDevX.Cart.Auth/            # Authentication & authorization
│   ├── AGDevX.Cart.Data/            # EF Core, DbContext, repositories
│   ├── AGDevX.Cart.Shared/          # Models, DTOs, interfaces, extensions
│   └── Tests/
│       ├── AGDevX.Cart.Api.Tests/
│       ├── AGDevX.Cart.Services.Tests/
│       ├── AGDevX.Cart.Auth.Tests/
│       └── AGDevX.Cart.Data.Tests/
├── frontend/                         # React 19 PWA
│   ├── src/
│   ├── e2e/                         # Playwright E2E tests
│   └── public/
├── docs/plans/                       # Implementation plans
└── README.md
```

## Tech Stack
- **Backend**: .NET 10, ASP.NET Core, Entity Framework Core, SQLite, System.Reactive
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, TanStack Query, Jotai, PWA
- **Testing**: xUnit (backend), Vitest + React Testing Library (frontend unit), Playwright (E2E)
- **Deployment**: Docker, Caddy (planned)
- **Real-time**: Server-Sent Events (SSE)

## Implementation Status

### ✅ Phase 1-6: Backend MVP (Tasks 1-25) - COMPLETE
- ✅ Tasks 1-3: Project structure, dependencies
- ✅ Tasks 4-8: Database models, DbContext, migrations
- ✅ Tasks 9-12: JWT authentication layer
- ✅ Tasks 13-17: All services and repositories (Household, Inventory, Trip, TripItem)
- ✅ Tasks 18-22: All API controllers (Household, Inventory, Trip, TripItem)
- ✅ Tasks 23-25: SSE infrastructure with System.Reactive
- **Tests**: 115 backend tests passing
- **Completed**: 2026-01-25

### ✅ Phase 7-8: Frontend PWA (Tasks 26-38) - COMPLETE
- ✅ Task 1-15: Foundation (Vite, routing, auth, protected routes, bottom nav)
- ✅ Task 16-21: Authentication & Households (login, create/join household)
- ✅ Task 22-26: Inventory & Trips (CRUD, SSE real-time updates)
- ✅ Task 27-29: PWA Configuration (manifest, service worker, install prompt)
- ✅ Task 30-31: Integration & E2E tests
- **Tests**: 118 frontend tests passing (101 unit/integration + 17 E2E)
- **Design**: docs/plans/2026-01-31-frontend-pwa-design.md
- **Implementation**: docs/plans/2026-01-31-frontend-pwa-implementation.md
- **Completed**: 2026-01-31
- **Notes**: Frontend tests mock API calls - not yet connected to real backend

### 📋 Next Up: Integration & True E2E Testing
**Goal**: Connect frontend to backend and test the full stack together

**What needs to be done**:
1. Configure frontend to connect to backend API (update API URLs)
2. Run backend and frontend together
3. Create true end-to-end tests (frontend → backend → database)
4. Test real-time SSE connections between services
5. Verify authentication flow works across stack
6. Test all CRUD operations with real database

**Current State**:
- Frontend currently mocks all API calls for testing
- Backend and frontend have never run together
- No cross-stack integration tests exist yet

### 📋 Phase 9: Docker & Deployment (Tasks 39-42) - PLANNED
**Status**: Planned but not started - will do AFTER integration testing
- Task 39: Backend Dockerfile (multi-stage build)
- Task 40: Frontend production build + Dockerfile
- Task 41: Caddy reverse proxy configuration
- Task 42: Docker Compose orchestration
- **Plan**: docs/plans/2026-01-25-phase9-docker-deployment.md

### 📋 Phase 10: Additional Testing & Documentation (Task 43+) - PLANNED
**Status**: Planned but not started
- Task 43: Backend integration tests (WebApplicationFactory)
- Task 44+: Additional E2E tests, API docs, deployment docs
- **Plan**: docs/plans/2026-01-25-phase10-testing-docs.md

## What's Ready

### Backend
- ✅ Full REST API with authentication
- ✅ JWT-based authentication
- ✅ Complete data layer with EF Core + SQLite
- ✅ Real-time updates via Server-Sent Events
- ✅ Comprehensive test coverage (115 tests)

### Frontend
- ✅ Complete PWA with offline support
- ✅ Bottom navigation (mobile-first design)
- ✅ Authentication flow (username-only)
- ✅ Household management (create/join with invite codes)
- ✅ Inventory management (personal + household items)
- ✅ Shopping trip workflow (draft → active → completed)
- ✅ Real-time collaboration via SSE (mocked)
- ✅ PWA features (installable, service worker, manifest)
- ✅ Comprehensive test coverage (118 tests)

### What's NOT Ready
- ❌ Frontend connected to backend (still using mocks)
- ❌ True end-to-end testing across full stack
- ❌ Docker deployment
- ❌ Production configuration
- ❌ Backend integration tests

## Recent Work (2026-01-31)

### Frontend Implementation
- Used superpowers:brainstorming to design complete PWA
- Used superpowers:writing-plans to create detailed implementation plan
- Used superpowers:subagent-driven-development to execute (31 tasks)
- Followed TDD throughout all 31 implementation tasks
- Fixed all ESLint errors (31 errors → 0)
- Fixed TypeScript errors (global.fetch → globalThis.fetch)

### Git Workflow
- Created feature branch: ag/frontend-pwa
- Used git worktree for isolated development
- Merged to main via fast-forward (113 files, 17,034 lines added)
- All commits follow conventional commit format

## Running the Project

### Backend (Standalone)
```bash
cd backend
dotnet run --project AGDevX.Cart.Api
# API runs at http://localhost:5000
```

### Frontend (Standalone with Mocked API)
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

### Tests
```bash
# Backend tests
cd backend
dotnet test

# Frontend tests
cd frontend
npm test              # Unit/integration (Vitest)
npx playwright test   # E2E (Playwright)
```

## Items to Address Later

### Integration Phase
- [ ] Configure frontend API base URL to point to backend
- [ ] Set up CORS in backend for frontend origin
- [ ] Test authentication flow across stack
- [ ] Test SSE connections with real backend
- [ ] Create integration test suite
- [ ] Document how to run both services together

### Future Enhancements (Post-Deployment)
- [ ] Camera/barcode scanning for inventory items
- [ ] Category support for inventory
- [ ] Quantity tracking for trip items
- [ ] Multiple stores per household
- [ ] User profile management
- [ ] Auth0 migration (from simple username to OAuth)
