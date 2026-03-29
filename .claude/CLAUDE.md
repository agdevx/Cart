# AGDevX.Cart

Monorepo: .NET 10 API + React 19 PWA. Cookie-based auth, SQLite, TanStack Query, Tailwind CSS 4.

## Project State

Read `.claude/STATUS.md` first — it tracks all enhancements (planned / in progress / completed), test health, and known issues. That file also contains instructions for how to maintain it.

## Commands

```bash
# Backend (run from backend/)
dotnet build
dotnet test
dotnet run --project AGDevX.Cart.Api          # localhost:5000, OpenAPI at /openapi/v1.json

# Frontend (run from frontend/)
npm run dev                                    # Vite dev server, proxies /api → localhost:5000
npx tsc -b --noEmit                            # TypeScript check (MUST use -b, see gotchas)
npx eslint src/                                # Lint (enforces import sorting)
npx eslint --fix src/path/to/file.tsx          # Autofix import sorting
npx vitest run                                 # All unit/integration tests
npx vitest run src/path/to/test.tsx            # Single test file
```

## Gotchas

- **`tsc -b` is required.** Root `tsconfig.json` has `"files": []` — plain `tsc --noEmit` checks nothing and always passes. Use `tsc -b --noEmit` or `tsc --noEmit -p tsconfig.app.json`.
- **DLL locks when API is running.** `dotnet test` fails for Api.Tests while the backend is serving. Stop the API first or target a specific test project.
- **Frontend port varies.** Vite picks 5173, 5174, or 5175 depending on availability.
- **Import sorting is enforced.** ESLint uses `simple-import-sort/imports`. Run `--fix` to autofix.
- **Solution file is inside `backend/`.** All `dotnet` commands and project paths are relative to `backend/`.

## Project Structure

```
backend/
├── AGDevX.Cart.slnx
├── AGDevX.Cart.Api/              # Controllers, middleware, Program.cs
├── AGDevX.Cart.Api.Tests/
├── AGDevX.Cart.Auth/             # BCrypt password hashing, session auth
├── AGDevX.Cart.Auth.Tests/
├── AGDevX.Cart.Services/         # Business logic layer
├── AGDevX.Cart.Services.Tests/
├── AGDevX.Cart.Data/             # EF Core DbContext, models, repositories
├── AGDevX.Cart.Data.Tests/
└── AGDevX.Cart.Shared/           # DTOs, config

frontend/src/
├── apis/                         # apiFetch wrapper + TanStack Query hooks (one file per endpoint)
├── auth/                         # AuthProvider, useAuth hook, session management
├── pages/                        # Each page gets its own folder
│   ├── shopping/                 # Page component + page-specific components + tests
│   ├── pantry/
│   ├── household/
│   ├── settings/
│   ├── login/
│   └── register/
├── shared/                       # Components used by multiple pages
├── services/                     # Hooks for data fetching and business logic (*Service suffix)
├── state/                        # Jotai atoms (auth, household scope)
├── styles/                       # globals.css (Tailwind theme, animations)
└── utils/                        # Pure utility functions (confetti, greeting, sorting, etc.)

deploy/                           # Server deployment templates (not used in dev)
├── caddy/                        # Shared Caddy reverse proxy (docker-compose.yml, Caddyfile)
└── cart/                         # Cart app stack (docker-compose.yml, .env.example)
```

## Frontend Architecture Rules

- **Organize by domain, not by technical concept.** Folders represent features/functionality, not software patterns.
- **Each page gets its own folder** under `pages/`. Page-specific components, forms, and tests live in the same folder.
- **Shared components** used by multiple pages go in `shared/`. This includes layout primitives (PageHeader, SectionHeader), form primitives (FormField, ActionCancelFormButtons), filters (ScopeFilter, StoreFilter), dialogs, and navigation.
- **Forms live in their own file.** Create and Edit variants colocate in the same file.
- **Components never fetch data themselves.** Data fetching lives in service hooks that components consume via props or hooks.
- **Modals/dialogs live in their own file.**
- **Services** contain custom hooks for data fetching and business logic. Hook names end with `Service` (e.g., `useFocusTrapService`).

## Architecture Patterns

- **Auth:** Cookie-based sessions. Cookie `.Cart.Auth`, 30-min sliding expiration, `credentials: 'include'` on all fetches. `useAuth()` hook from `@/auth/use-auth`.
- **API layer:** `apiFetch()` wrapper handles credentials, error extraction, and `VITE_API_BASE_URL` prepending. Each endpoint gets a TanStack Query hook file in `apis/agdevx-cart-api/`.
- **State:** Jotai atoms for auth state and household scope. TanStack Query for server state.
- **Styling:** Tailwind CSS 4 with custom theme in `globals.css`. Design system colors: `navy`, `teal`, `coral`, `amber`. Font: `font-display` (Bricolage Grotesque), `font-body` (Nunito).

## Frontend Testing Patterns

- **Framework:** Vitest + React Testing Library
- **Test dirs:** `pages/tests/` for page tests, `pages/components/tests/` for component tests
- **Query mocks:** `vi.mock()` the hook module, shape return via `vi.mocked(useXQuery).mockReturnValue({ data, isLoading, ... })`
- **Mutation mocks:** Mock `globalThis.fetch`, render with `QueryClientProvider`
- **User interactions:** Prefer `userEvent` over `fireEvent` for new tests

## Git

- No co-authorship in commits
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
