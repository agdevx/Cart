# Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize AGDevX.Cart (backend + frontend) with Docker, add CI/CD via GitHub Actions, and prepare for deployment behind a shared Caddy reverse proxy on a home server.

**Architecture:** Two Docker images (backend API + Nginx-served SPA) deployed behind a shared Caddy reverse proxy. CI runs tests on PRs, builds and pushes images on merge to main. The SPA is served under `/cart` and the API under `/cart/api`. Caddy strips the `/cart` prefix before forwarding.

**Tech Stack:** Docker, Docker Compose, Caddy, Nginx, GitHub Actions, .NET 10, Node.js, Vite

---

### Task 1: Rename Connection String

**Files:**
- Modify: `backend/AGDevX.Cart.Api/appSettings.json`
- Modify: `backend/AGDevX.Cart.Api/Program.cs:79`

- [ ] **Step 1: Update appSettings.json**

Change the connection string key from `DefaultConnection` to `CartDb`:

```json
"ConnectionStrings": {
  "CartDb": "Data Source=cart.db"
}
```

- [ ] **Step 2: Update Program.cs**

Change line 79 in `backend/AGDevX.Cart.Api/Program.cs`:

```csharp
builder.Services.AddDbContext<CartDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("CartDb")));
```

- [ ] **Step 3: Run backend tests to verify nothing broke**

Run from `backend/`:
```bash
dotnet test
```

Expected: All 322 tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/AGDevX.Cart.Api/appSettings.json backend/AGDevX.Cart.Api/Program.cs
git commit -m "refactor: rename DefaultConnection to CartDb"
```

---

### Task 2: Remove HTTPS Middleware

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs:115-119`

- [ ] **Step 1: Remove the HSTS/HTTPS redirect block**

Remove these lines from `backend/AGDevX.Cart.Api/Program.cs`:

```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
```

This is safe because Tailscale encrypts all traffic at the network layer.

- [ ] **Step 2: Run backend tests**

Run from `backend/`:
```bash
dotnet test
```

Expected: All 322 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Api/Program.cs
git commit -m "fix: remove HTTPS middleware for Tailscale-only deployment"
```

---

### Task 3: Add VITE_API_BASE_URL Support to apiFetch

**Files:**
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`
- Modify: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`

- [ ] **Step 1: Write failing test for API base URL**

Add this test to the existing describe block in `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`:

```typescript
it('should prepend VITE_API_BASE_URL to endpoint', async () => {
  const originalEnv = import.meta.env.VITE_API_BASE_URL;
  import.meta.env.VITE_API_BASE_URL = '/cart/api';

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  globalThis.fetch = mockFetch;

  await apiFetch('/api/v1/items', { method: 'GET' });

  const calledUrl = mockFetch.mock.calls[0][0];
  expect(calledUrl).toBe('/cart/api/api/v1/items');

  import.meta.env.VITE_API_BASE_URL = originalEnv;
});

it('should work with empty VITE_API_BASE_URL', async () => {
  const originalEnv = import.meta.env.VITE_API_BASE_URL;
  import.meta.env.VITE_API_BASE_URL = '';

  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  globalThis.fetch = mockFetch;

  await apiFetch('/api/v1/items', { method: 'GET' });

  const calledUrl = mockFetch.mock.calls[0][0];
  expect(calledUrl).toBe('/api/v1/items');

  import.meta.env.VITE_API_BASE_URL = originalEnv;
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
```

Expected: The two new tests fail (apiFetch doesn't prepend the base URL yet).

- [ ] **Step 3: Update apiFetch to prepend base URL**

In `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`, add a constant after `REQUEST_TIMEOUT_MS`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
```

Then change the fetch call from:

```typescript
const response = await fetch(endpoint, {
```

to:

```typescript
const response = await fetch(`${API_BASE_URL}${endpoint}`, {
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`:
```bash
npx vitest run src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Run full frontend test suite**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: All 525 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts
git commit -m "feat: add VITE_API_BASE_URL support to apiFetch"
```

---

### Task 4: Configure Vite Base Path and React Router Basename

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/app.tsx`
- Create: `frontend/.env.development`
- Create: `frontend/.env.production`

- [ ] **Step 1: Create frontend environment files**

Create `frontend/.env.development`:
```
VITE_API_BASE_URL=
VITE_BASE_PATH=/
```

Create `frontend/.env.production`:
```
VITE_API_BASE_URL=/cart/api
VITE_BASE_PATH=/cart
```

- [ ] **Step 2: Update vite.config.ts to use VITE_BASE_PATH**

In `frontend/vite.config.ts`, change the `defineConfig` call to accept the env:

Replace:
```typescript
export default defineConfig({
```

With:
```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
```

Add `loadEnv` to the import:
```typescript
import { defineConfig, loadEnv } from 'vitest/config'
```

Add `base` as the first property inside the returned config object:
```typescript
    base: env.VITE_BASE_PATH || '/',
```

And close the function with `}` after the existing closing `}`:
```typescript
  }
})
```

- [ ] **Step 3: Update BrowserRouter with basename**

In `frontend/src/app.tsx`, change:

```tsx
<BrowserRouter>
```

to:

```tsx
<BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
```

- [ ] **Step 4: Run TypeScript check**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run full frontend test suite**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/vite.config.ts frontend/src/app.tsx frontend/.env.development frontend/.env.production
git commit -m "feat: configure base path for sub-path deployment"
```

---

### Task 5: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create backend/.dockerignore**

```
.git/
.vs/
.vscode/
.idea/
**/bin/
**/obj/
*.db
*.db-shm
*.db-wal
*.user
*.suo
```

- [ ] **Step 2: Create backend/Dockerfile**

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY AGDevX.Cart.slnx .
COPY AGDevX.Cart.Api/AGDevX.Cart.Api.csproj AGDevX.Cart.Api/
COPY AGDevX.Cart.Services/AGDevX.Cart.Services.csproj AGDevX.Cart.Services/
COPY AGDevX.Cart.Auth/AGDevX.Cart.Auth.csproj AGDevX.Cart.Auth/
COPY AGDevX.Cart.Data/AGDevX.Cart.Data.csproj AGDevX.Cart.Data/
COPY AGDevX.Cart.Shared/AGDevX.Cart.Shared.csproj AGDevX.Cart.Shared/

RUN dotnet restore AGDevX.Cart.Api/AGDevX.Cart.Api.csproj

COPY . .
WORKDIR /src/AGDevX.Cart.Api
RUN dotnet publish AGDevX.Cart.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS runtime
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:2946

EXPOSE 2946

ENTRYPOINT ["dotnet", "AGDevX.Cart.Api.dll"]
```

Note: Using `10.0-preview` tags because .NET 10 may not have a stable release yet. Update to `10.0` when the stable images are available.

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: add multi-stage Dockerfile for backend API"
```

---

### Task 6: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create frontend/.dockerignore**

```
node_modules/
dist/
.env
.env.local
*.log
```

- [ ] **Step 2: Create frontend/nginx.conf**

This configures Nginx to serve the SPA and handle client-side routing by falling back to `index.html`:

```nginx
server {
    listen 3750;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Create frontend/Dockerfile**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3750

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
git commit -m "feat: add multi-stage Dockerfile for frontend SPA"
```

---

### Task 7: CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows/ci.yml**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Restore dependencies
        run: dotnet restore
        working-directory: backend

      - name: Build
        run: dotnet build --no-restore
        working-directory: backend

      - name: Test
        run: dotnet test --no-build --verbosity normal
        working-directory: backend

  frontend-checks:
    name: Frontend Checks
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: TypeScript check
        run: npx tsc -b --noEmit
        working-directory: frontend

      - name: Lint
        run: npx eslint src/
        working-directory: frontend

      - name: Tests
        run: npx vitest run
        working-directory: frontend
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add CI workflow for tests, lint, and type checking"
```

---

### Task 8: Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create .github/workflows/deploy.yml**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  ci:
    name: CI
    uses: ./.github/workflows/ci.yml

  build-and-push:
    name: Build & Push Images
    runs-on: ubuntu-latest
    needs: ci

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Get short SHA
        id: sha
        run: echo "short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Build and push backend
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: |
            agdevx/cart-backend:latest
            agdevx/cart-backend:${{ steps.sha.outputs.short }}

      - name: Build and push frontend
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: true
          tags: |
            agdevx/cart-frontend:latest
            agdevx/cart-frontend:${{ steps.sha.outputs.short }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add deploy workflow to build and push Docker images"
```

---

### Task 9: Server Configuration Files

These files live on the server, not in the repo. We'll create example/template versions in the repo under `deploy/` so they're documented and version-controlled.

**Files:**
- Create: `deploy/caddy/docker-compose.yml`
- Create: `deploy/caddy/Caddyfile`
- Create: `deploy/cart/docker-compose.yml`
- Create: `deploy/cart/.env.example`

- [ ] **Step 1: Create deploy/caddy/docker-compose.yml**

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - proxy
    restart: unless-stopped

networks:
  proxy:
    name: proxy
    driver: bridge
```

- [ ] **Step 2: Create deploy/caddy/Caddyfile**

```
{
	auto_https off
	admin off
}

:80 {
	handle /cart/api/* {
		uri strip_prefix /cart
		reverse_proxy backend:2946
	}

	handle /cart/* {
		uri strip_prefix /cart
		reverse_proxy frontend:3750
	}
}
```

Note: The `reverse_proxy` targets use Docker service names. When Caddy runs in the `proxy` network alongside the cart containers, it can resolve `backend` and `frontend` by name.

- [ ] **Step 3: Create deploy/cart/docker-compose.yml**

```yaml
services:
  frontend:
    image: agdevx/cart-frontend:latest
    networks:
      - proxy
    restart: unless-stopped

  backend:
    image: agdevx/cart-backend:latest
    env_file: .env
    volumes:
      - ${CART_DB_PATH:?Set CART_DB_PATH in .env}:/app/data
    networks:
      - proxy
    restart: unless-stopped

networks:
  proxy:
    external: true
```

- [ ] **Step 4: Create deploy/cart/.env.example**

```
# Path to the folder on the host where cart.db will be stored (bind mount)
CART_DB_PATH=C:\cart-data

# .NET database connection string (path inside the container)
ConnectionStrings__CartDb=Data Source=/app/data/cart.db

# .NET environment
ASPNETCORE_ENVIRONMENT=Production
```

- [ ] **Step 5: Commit**

```bash
git add deploy/
git commit -m "feat: add server deployment templates for Caddy and Cart stacks"
```

---

### Task 10: Verify and Clean Up

- [ ] **Step 1: Run full backend test suite**

Run from `backend/`:
```bash
dotnet test
```

Expected: All 322 tests pass.

- [ ] **Step 2: Run full frontend test suite**

Run from `frontend/`:
```bash
npx vitest run
```

Expected: All 525 tests pass.

- [ ] **Step 3: Run TypeScript check**

Run from `frontend/`:
```bash
npx tsc -b --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run lint**

Run from `frontend/`:
```bash
npx eslint src/
```

Expected: No errors.

- [ ] **Step 5: Update STATUS.md**

Move Docker Deployment from "Planned Enhancements" to "In Progress Enhancements" and update the planning doc link to point to the new spec.
