# Development Guide

Guide for running the full AGDevX.Cart application in development mode.

## Prerequisites

- .NET 10 SDK
- Node.js 18+ and npm
- Git

## Project Structure

This is a monorepo with separate backend (.NET) and frontend (React) applications:

```
AGDevX.Cart/
├── backend/          # .NET 10 API
├── frontend/         # React 19 PWA
└── docs/            # Documentation
```

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AGDevX.Cart
```

### 2. Backend Setup

```bash
cd backend

# Restore dependencies
dotnet restore

# Build the solution
dotnet build

# Run database migrations (automatically applied on startup)
# Database file will be created at: backend/AGDevX.Cart.Api/cart.db

# Run tests to verify setup
dotnet test
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

No environment file is needed — the Vite dev server proxies `/api` requests to the backend automatically.

## Running the Application

### Option A: Run Backend and Frontend Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
dotnet run --project AGDevX.Cart.Api
# API will be available at http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend will be available at http://localhost:5173
# All /api requests are proxied to http://localhost:5000
```

### Option B: Run Integration Tests (Starts Both Automatically)

```bash
cd frontend
npm run test:integration
# Playwright will start both backend and frontend automatically
```

## Development Workflow

### Making Changes

1. **Backend Changes:**
   - Make code changes in `backend/` directory
   - Backend auto-reloads on file changes (hot reload enabled)
   - Run tests: `cd backend && dotnet test`

2. **Frontend Changes:**
   - Make code changes in `frontend/src/` directory
   - Vite provides instant HMR (Hot Module Replacement)
   - Run tests: `cd frontend && npm test`

### Testing

#### Backend Tests
```bash
cd backend
dotnet test                                    # Run all backend tests (134 tests)
dotnet test --filter "Category=Unit"          # Run only unit tests
dotnet test --logger "console;verbosity=detailed"  # Verbose output
```

#### Frontend Tests
```bash
cd frontend
npm test                           # Run unit/integration tests (149 tests)
npm run test:ui                    # Run with Vitest UI
npm run test:e2e                   # Run E2E tests with mocked API
npm run test:e2e:ui                # Run E2E tests with Playwright UI
npm run test:integration           # Run integration tests against real backend
npm run test:integration:ui        # Run integration tests with Playwright UI
```

## Authentication

The app uses **cookie-based authentication**. On login or registration, the backend calls `HttpContext.SignInAsync()` to create a session cookie. The cookie is sent automatically on all requests (including SSE `EventSource` connections).

### How It Works

1. User submits login/register form
2. Backend validates credentials, calls `HttpContext.SignInAsync()` with claims
3. Browser receives `.Cart.Auth` cookie (HttpOnly, SameSite=Lax)
4. Frontend `apiFetch()` includes `credentials: 'include'` — cookie sent automatically
5. On page refresh, `AuthProvider` calls `GET /api/auth/me` to validate the session

### Vite Proxy

The frontend dev server proxies all `/api/*` requests to `http://localhost:5000`. This makes API calls same-origin from the browser's perspective, which is required for cookie-based auth to work in development without complex CORS configuration.

## API Documentation

When running in development mode, API documentation is available at:
- OpenAPI/Swagger: `http://localhost:5000/openapi/v1.json`
- Scalar UI: `http://localhost:5000/scalar/v1`

## Database

The backend uses SQLite with Entity Framework Core:
- **Database file:** `backend/AGDevX.Cart.Api/cart.db`
- **Migrations:** Applied automatically on startup
- **Reset database:** Delete `cart.db` file and restart backend

## Configuration

### Backend (`backend/AGDevX.Cart.Api/appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=cart.db"
  },
  "CookieSettings": {
    "SessionTimeoutMinutes": 30
  }
}
```

### Frontend

No environment files needed. The Vite proxy in `vite.config.ts` handles routing `/api` requests to the backend:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

## Ports

- **Backend API:** `http://localhost:5000`
- **Frontend:** `http://localhost:5173`

## Troubleshooting

### Backend won't start
- Check if port 5000 is already in use
- Ensure .NET 10 SDK is installed: `dotnet --version`
- Try cleaning: `dotnet clean && dotnet build`

### Frontend won't start
- Check if port 5173 is already in use
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)

### CORS errors
- Ensure backend is running and accessible at `http://localhost:5000`
- The Vite proxy should handle all `/api` requests — check `vite.config.ts`
- Backend CORS is configured to allow `http://localhost:5173` as a fallback

### Database errors
- Delete `cart.db` file and restart backend to recreate
- Check migrations: `cd backend && dotnet ef migrations list`

### Integration tests failing
- Ensure both backend and frontend are NOT already running
- Playwright will start them automatically
- Check that ports 5000 and 5173 are available

## Common Tasks

### Add a new database migration
```bash
cd backend
dotnet ef migrations add MigrationName --project AGDevX.Cart.Data --startup-project AGDevX.Cart.Api
```

### Install new backend package
```bash
cd backend
dotnet add AGDevX.Cart.Api package PackageName
```

### Install new frontend package
```bash
cd frontend
npm install package-name
```

### Update all dependencies
```bash
# Backend
cd backend && dotnet restore

# Frontend
cd frontend && npm update
```

## Next Steps

- See `README.md` for project overview
- See `docs/plans/` for implementation details
- See `.claude/NOTES.md` for project status and history
