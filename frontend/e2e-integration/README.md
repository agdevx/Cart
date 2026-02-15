# Integration Tests

Full-stack integration tests that verify the frontend, backend, and database working together.

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with UI mode for debugging
npm run test:integration:ui
```

## Prerequisites

- Backend API must be available at `http://localhost:5000`
- Frontend dev server must be available at `http://localhost:5173`
- Database must be initialized (migrations applied)

The Playwright config will automatically start both servers if they're not already running.

## Test Coverage

- **auth.integration.spec.ts**: User registration, login, session persistence
- **household.integration.spec.ts**: Household creation, joining with invite codes
- **inventory.integration.spec.ts**: Inventory CRUD operations
- **trip.integration.spec.ts**: Shopping trip workflow, adding items, checking off items, completion

## Key Differences from E2E Tests

- **E2E tests** (`e2e/`): Use mocked API responses for fast, isolated testing
- **Integration tests** (`e2e-integration/`): Connect to real backend for full-stack verification

## Notes

- Tests run serially (single worker) to avoid database conflicts
- Each test creates unique usernames using timestamps to avoid collisions
- Tests may modify the database - consider using a test database or cleaning up between runs
