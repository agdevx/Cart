# Docker Deployment

## Design Spec

### Overview

Containerize and deploy AGDevX.Cart to a Windows 11 home server running Docker Desktop. The server uses Tailscale for network access — no public internet exposure, no HTTPS required. All devices accessing the app are on the Tailscale network.

### Container Architecture

Three containers across two Docker Compose stacks:

```
┌──────────────────────────────────────────────────────┐
│  Docker Desktop (Windows 11 home server)             │
│                                                      │
│  ┌──────────────────────────────────┐  caddy stack   │
│  │  Caddy (shared reverse proxy)    │                │
│  │  - Port 80 (only exposed port)   │                │
│  │  - /cart      → cart-frontend    │                │
│  │  - /cart/api  → cart-backend     │                │
│  │  - Future apps get new routes    │                │
│  └──────┬───────────────┬───────────┘                │
│         │               │                            │
│         │  shared "proxy" Docker network             │
│         │               │                            │
│  ┌──────┴──────┐  ┌─────┴──────────┐  cart stack    │
│  │  Nginx      │  │  .NET 10 API   │                │
│  │  (SPA host) │  │  (REST API)    │                │
│  │  Port 8080  │  │  Port 5000     │                │
│  │  internal   │  │  internal      │                │
│  └─────────────┘  └──────┬─────────┘                │
│                          │                           │
│                   ┌──────┴──────┐                    │
│                   │   cart.db   │                    │
│                   │ (bind mount)│                    │
│                   └─────────────┘                    │
└──────────────────────────────────────────────────────┘
```

**Caddy** is shared infrastructure — its own compose file, owns port 80, routes to apps by path prefix. As new apps are added to the server, they get new routes in the Caddyfile.

**Nginx** serves the built SPA static files. Internal only — Caddy proxies `/cart/*` to it.

**.NET API** runs the backend. Internal only — Caddy proxies `/cart/api/*` to it.

All containers communicate over a shared Docker network named `proxy`. Only Caddy exposes a port to the host.

### Routing

Caddy uses `handle` with `uri strip_prefix /cart` to strip the `/cart` prefix before forwarding:

- Browser requests `/cart/shopping` → Caddy strips `/cart` → Nginx receives `/shopping` → serves `index.html` (SPA routing)
- Browser requests `/cart/api/v1/items` → Caddy strips `/cart` → API receives `/api/v1/items`
- SPA assets at `/cart/assets/main.js` → Caddy strips `/cart` → Nginx serves `/assets/main.js`

The API keeps its existing `/api/v1/` prefix — Caddy only strips `/cart`, not `/cart/api`.

### Docker Images

Two images pushed to Docker Hub:

**`agdevx/cart-backend`**

- Multi-stage Dockerfile in `backend/`
- Stage 1 (build): .NET 10 SDK — restore, build, publish
- Stage 2 (runtime): .NET 10 ASP.NET runtime (smaller image)
- Exposes port 5000
- Database path configured via environment variable

**`agdevx/cart-frontend`**

- Multi-stage Dockerfile in `frontend/`
- Stage 1 (build): Node — `npm ci`, `npm run build` (produces `dist/`)
- Stage 2 (runtime): Nginx Alpine — copies `dist/` into Nginx's serve directory
- Nginx config handles SPA fallback (serves `index.html` for routes that aren't static files)
- Exposes port 8080 internally

**Image tagging:**

- Every push to main tags with `latest` and the short git SHA (e.g., `agdevx/cart-backend:a1b2c3d`)
- `latest` is what runs on the server
- SHA tags provide rollback capability

**Caddy** uses the official `caddy:2-alpine` image directly — no custom image needed.

### Compose Files

**`caddy/docker-compose.yml`** — shared infrastructure, lives on the server:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - '80:80'
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

**`caddy/Caddyfile`** — lives on the server alongside the compose file:

```
{
    auto_https off
    admin off
}

:80 {
    handle /cart/api/* {
        uri strip_prefix /cart
        reverse_proxy backend:5000
    }

    handle /cart/* {
        uri strip_prefix /cart
        reverse_proxy frontend:8080
    }
}
```

`handle` (not `handle_path`) keeps the path intact, then `uri strip_prefix /cart` removes only the `/cart` prefix. The API receives `/api/v1/...` as it expects.

**`cart/docker-compose.yml`** — the Cart app stack, lives on the server:

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
      - C:\path\to\cart-data:/app/data
    networks:
      - proxy
    restart: unless-stopped

networks:
  proxy:
    external: true
```

**`cart/.env`** — environment-specific config, lives on the server (not in the repo):

```
ConnectionStrings__CartDb=Data Source=/app/data/cart.db
ASPNETCORE_ENVIRONMENT=Production
```

### Database

- SQLite file (`cart.db`) stored via bind mount from a Windows folder on the server
- The bind mount folder is automatically backed up by existing backup tooling on the server
- Database migrations run automatically on API startup (existing behavior)
- The connection string is configured via environment variable `ConnectionStrings__CartDb`

### CI/CD Pipeline

Two GitHub Actions workflow files:

**`ci.yml`** — runs on pull requests and pushes to main:

- Backend: `dotnet test` (all test projects)
- Frontend: `npx tsc -b --noEmit`, `npx eslint src/`, `npx vitest run`
- Reports pass/fail

**`deploy.yml`** — runs on pushes to main and manual trigger (`workflow_dispatch`):

- Requires CI to pass first
- Builds both Docker images (multi-stage)
- Tags with `latest` and short git SHA
- Pushes to Docker Hub

**GitHub repo secrets required:**

- `DOCKERHUB_USERNAME` — Docker Hub username (`agdevx`)
- `DOCKERHUB_TOKEN` — Docker Hub personal access token with read/write permissions

**How to create a Docker Hub token:**

1. Log into hub.docker.com
2. Profile icon → Account settings → Security → Personal access tokens
3. Generate new token, name it `github-actions`, set permissions to Read & Write
4. Copy the token (shown only once)
5. In the GitHub repo: Settings → Secrets and variables → Actions
6. Add `DOCKERHUB_USERNAME` = `agdevx`
7. Add `DOCKERHUB_TOKEN` = the token you copied

### Updates

Manual via Docker Desktop on the server. When new images are pushed to Docker Hub:

1. Open Docker Desktop
2. Pull new images
3. Recreate containers

Automated pulling (e.g., Watchtower) can be added later if desired.

### Code Changes Required

Small changes to the existing codebase to support deployment:

1. **Rename connection string** — `DefaultConnection` → `CartDb` in `appsettings.json` and `Program.cs`
2. **Remove HTTPS middleware** — remove `UseHsts()` and `UseHttpsRedirection()` from `Program.cs` (Tailscale encrypts traffic at the network layer)
3. **Add `VITE_API_BASE_URL` support** — `apiFetch` prepends this env var to all endpoints
4. **Set Vite `base` for production** — `base: '/cart'` in `vite.config.ts` so assets load from `/cart/`
5. **Add React Router `basename`** — so SPA routes work under `/cart`
6. **Add `.env.development`** — `VITE_API_BASE_URL=` (empty string, keeps current dev behavior)
7. **Add `.env.production`** — `VITE_API_BASE_URL=/cart/api`

No business logic changes. No new features.

### Server Setup Steps (One-Time)

1. Create Docker Hub access token and add as GitHub repo secrets
2. Create folder structure on the server:
   ```
   somewhere\caddy\docker-compose.yml
   somewhere\caddy\Caddyfile
   somewhere\cart\docker-compose.yml
   somewhere\cart\.env
   ```
3. Create the bind mount folder for the database (e.g., `C:\cart-data\`)
4. Start Caddy stack: `docker compose up -d` from `caddy\`
5. Start Cart stack: `docker compose up -d` from `cart\`

## Implementation Plan

_To be written after design approval._
