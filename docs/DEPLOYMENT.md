# Deployment Guide

Guide for deploying AGDevX.Cart to a home server running Docker Desktop over Tailscale.

## Architecture Overview

The application runs as two Docker containers behind a shared reverse proxy:

```
Browser (Tailscale device)
    │
    ▼
┌────────────────────────────────────────────────────┐
│  Home Server (Docker Desktop, Windows 11)          │
│                                                    │
│  ┌──────────────────────────────┐   caddy stack    │
│  │  Caddy (reverse proxy)       │                  │
│  │  Port 80 — only exposed port │                  │
│  └──────┬───────────────┬───────┘                  │
│         │               │                          │
│     /cart/api/*      /cart/*                        │
│    (strips /cart)   (strips /cart)                  │
│         │               │                          │
│  ┌──────┴──────┐  ┌─────┴──────────┐  cart stack   │
│  │  Backend    │  │  Frontend      │               │
│  │  .NET 10   │  │  Nginx         │               │
│  │  Port 2946 │  │  Port 3750     │               │
│  │  (internal)│  │  (internal)    │               │
│  └──────┬─────┘  └────────────────┘               │
│         │                                          │
│    ┌────┴─────┐                                    │
│    │ cart.db  │  bind mount to host folder          │
│    └──────────┘                                    │
└────────────────────────────────────────────────────┘
```

### How Requests Flow

1. You open `http://<tailscale-ip>/cart` in your browser
2. The request hits **Caddy** on port 80 (the only port exposed to the network)
3. Caddy matches the URL path and routes it:
   - `/cart/api/*` → strips `/cart` → forwards `/api/*` to the **backend** on port 2946
   - `/cart/*` → strips `/cart` → forwards to the **frontend** (Nginx) on port 3750
4. The backend reads/writes the SQLite database via a bind-mounted folder
5. The frontend serves the pre-built SPA static files (HTML, JS, CSS)

### Why This Architecture

- **Single entry point.** One URL, one port. Caddy handles all routing.
- **No CORS issues.** Everything is same-origin from the browser's perspective.
- **Cookie auth works seamlessly.** Same origin means `SameSite: Lax` cookies flow without issues.
- **Caddy is shared infrastructure.** Future apps get new routes in the Caddyfile without touching the Cart stack.
- **Containers are isolated.** Only Caddy is exposed to the network. The backend and frontend are only reachable through Caddy via Docker's internal network.

## Components

### Caddy (Reverse Proxy)

- Official `caddy:2-alpine` image — no custom build needed
- Owns port 80 on the host
- Routes requests by path prefix to the correct container
- Runs in its own Docker Compose stack so it can be shared across apps
- Config lives in a `Caddyfile` mounted as a read-only volume

### Frontend (Nginx + SPA)

- Custom image: `agdevx/cart-frontend` on Docker Hub
- Multi-stage Docker build: Node builds the SPA, Nginx Alpine serves the output
- Nginx listens on port 3750 (internal only)
- Handles SPA client-side routing by falling back to `index.html` for unknown paths
- The production build bakes in `VITE_BASE_PATH=/cart` and `VITE_API_BASE_URL=/cart/api`

### Backend (.NET API)

- Custom image: `agdevx/cart-backend` on Docker Hub
- Multi-stage Docker build: .NET SDK builds and publishes, ASP.NET runtime runs the app
- Listens on port 2946 (internal only)
- SQLite database stored at `/app/data/cart.db` inside the container, which maps to a folder on the host via bind mount
- Database migrations run automatically on startup
- Configuration via environment variables (connection string, environment name)

### Docker Networks

All three containers share a Docker network named `proxy`. This allows them to communicate using container/service names (e.g., Caddy reaches the backend at `backend:2946`). The network is created by the Caddy stack and joined by the Cart stack.

## CI/CD Pipeline

### How It Works

Two GitHub Actions workflows automate testing and deployment:

```
Pull Request opened
    │
    ▼
┌─────────────────────────┐
│  ci.yml                 │
│  - Backend tests        │  ← runs in parallel
│  - Frontend tsc + lint  │  ← runs in parallel
│  - Frontend tests       │
└─────────────────────────┘
    │
    ▼
  Pass/Fail reported on PR


Push to main (merge)
    │
    ▼
┌─────────────────────────┐
│  deploy.yml             │
│  1. Run CI checks       │
│  2. Build Docker images │
│  3. Tag with latest +   │
│     git SHA             │
│  4. Push to Docker Hub  │
└─────────────────────────┘
    │
    ▼
  Images available on Docker Hub
    │
    ▼
  Manually update via Docker Desktop
```

### Triggers

| Event | What Runs |
|-------|-----------|
| Pull request to main | `ci.yml` — tests, lint, tsc only |
| Push to main (merge) | `deploy.yml` — CI checks + build + push images |
| Manual (workflow_dispatch) | `deploy.yml` — same as push to main |

### Image Tags

Every deploy tags images two ways:

- `latest` — always the most recent build, what the server runs
- `<short-git-sha>` (e.g., `a1b2c3d`) — for rollback if an update breaks something

### Required GitHub Secrets

These must be configured in the GitHub repo under Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|-------|
| `DOCKERHUB_USERNAME` | `agdevx` |
| `DOCKERHUB_TOKEN` | Docker Hub personal access token (read/write) |

**To create a Docker Hub token:**

1. Log into hub.docker.com
2. Profile icon → Account settings → Security → Personal access tokens
3. Generate new token, name it `github-actions`, set permissions to Read & Write
4. Copy the token (shown only once)

## Server Setup (One-Time)

### Prerequisites

- Docker Desktop installed and running on the home server
- Tailscale installed and connected on the server and all client devices

### 1. Create the Database Folder

Create a folder on the server where the SQLite database will live. This folder should be in a location covered by your backup tooling.

```
C:\cart-data\
```

### 2. Create the Caddy Stack

Create a folder for the Caddy configuration:

```
C:\docker\caddy\docker-compose.yml
C:\docker\caddy\Caddyfile
```

Copy the contents from `deploy/caddy/` in the repo. These are templates — use them as-is or adjust paths to your preference.

Start Caddy. In Docker Desktop, open a terminal in the `C:\docker\caddy` folder and run `docker compose up -d`. Or drag the folder into Docker Desktop if it supports compose file detection. This creates the shared `proxy` network and starts the Caddy container.

Alternatively, from a terminal:

```bash
cd C:\docker\caddy
docker compose up -d
```

### 3. Create the Cart Stack

Create a folder for the Cart app:

```
C:\docker\cart\docker-compose.yml
C:\docker\cart\.env
```

Copy `docker-compose.yml` from `deploy/cart/` in the repo.

Create `.env` based on `deploy/cart/.env.example`:

```
CART_DB_PATH=C:\cart-data
ConnectionStrings__CartDb=Data Source=/app/data/cart.db
ASPNETCORE_ENVIRONMENT=Production
```

`CART_DB_PATH` is the Windows folder you created in step 1. This gets bind-mounted into the backend container at `/app/data/`.

Start the Cart stack the same way — open a terminal in `C:\docker\cart` and run `docker compose up -d`.

### 4. Verify

Open a browser on any Tailscale device and navigate to:

```
http://<tailscale-ip>/cart
```

You should see the login page. Register a new account to verify the full stack is working.

## Updating the Application

When you merge changes to main, the CI/CD pipeline builds new images and pushes them to Docker Hub. To deploy the update:

### Via Docker Desktop

1. Open Docker Desktop on the server
2. Navigate to the **Containers** view
3. Find the Cart stack (`cart`)
4. Stop the stack
5. Navigate to **Images**, find `agdevx/cart-backend` and `agdevx/cart-frontend`
6. Pull the latest versions
7. Go back to **Containers** and start the Cart stack

### Via Command Line

Alternatively, two commands from a terminal:

```bash
cd C:\docker\cart
docker compose pull
docker compose up -d
```

Either approach pulls the latest images and recreates only the containers that changed. The database is unaffected — it lives on the host filesystem via the bind mount.

## Rolling Back

If an update causes issues, you can roll back to a specific version using the git SHA tag:

```bash
cd C:\docker\cart
```

Edit `docker-compose.yml` to pin specific versions:

```yaml
services:
  frontend:
    image: agdevx/cart-frontend:a1b2c3d   # specific SHA instead of latest

  backend:
    image: agdevx/cart-backend:a1b2c3d    # specific SHA instead of latest
```

Then:

```bash
docker compose pull
docker compose up -d
```

To find available tags, check the commit history or Docker Hub.

After fixing the issue, revert `docker-compose.yml` back to `latest` and deploy normally.

## Adding Future Apps

Caddy is designed to be shared. To add a new app:

1. Add routes to the Caddyfile:

   ```
   handle /newapp/api/* {
       uri strip_prefix /newapp
       reverse_proxy newapp-backend:PORT
   }

   handle /newapp/* {
       uri strip_prefix /newapp
       reverse_proxy newapp-frontend:PORT
   }
   ```

2. Make sure the new app's containers join the `proxy` network (use `networks: proxy: external: true` in its compose file)

3. Restart Caddy to pick up the config change:

   ```bash
   cd C:\docker\caddy
   docker compose restart
   ```

## Database

### Location

The SQLite database file lives at `C:\cart-data\cart.db` on the server (or wherever you set `CART_DB_PATH`). This is bind-mounted into the backend container at `/app/data/cart.db`.

### Backups

The bind mount folder is covered by existing backup tooling on the server. No additional backup configuration is needed. Every time the database changes, the file on disk changes, and your backup tool picks it up.

### Migrations

Database migrations run automatically when the backend container starts. No manual migration steps are needed during updates.

### Resetting the Database

To start fresh, stop the backend container, delete `cart.db` from the bind mount folder, and restart. The backend will create a new empty database on startup.

```bash
cd C:\docker\cart
docker compose stop backend
del C:\cart-data\cart.db
docker compose start backend
```

## Troubleshooting

### App not loading at all

- Verify Caddy is running: check Docker Desktop or `docker compose ps` in the Caddy folder
- Verify the Cart containers are running: check Docker Desktop or `docker compose ps` in the Cart folder
- Verify Tailscale is connected on both the server and your device

### Login page loads but API calls fail

- Check that the backend container is running and healthy
- Check backend logs: `docker compose logs backend` in the Cart folder
- Verify the `.env` file has the correct connection string

### Database errors on startup

- Check that `CART_DB_PATH` in `.env` points to an existing folder on the host
- Check that the folder has write permissions
- Check backend logs for migration errors: `docker compose logs backend`

### After updating, old version still showing

- The browser may be serving a cached version of the SPA. Hard refresh (Ctrl+Shift+R) or clear the browser cache.
- Verify the new images were actually pulled: `docker compose pull` in the Cart folder

### Containers keep restarting

- Check logs for crash details: `docker compose logs <service-name>`
- Common causes: missing `.env` file, invalid connection string, bind mount path doesn't exist

## File Reference

### In the Repo

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Multi-stage build for the .NET API |
| `backend/.dockerignore` | Files excluded from the Docker build context |
| `frontend/Dockerfile` | Multi-stage build for the SPA (Node build → Nginx serve) |
| `frontend/.dockerignore` | Files excluded from the Docker build context |
| `frontend/nginx.conf` | Nginx config for SPA routing (try_files fallback) |
| `frontend/.env.production` | Production base paths baked into the SPA build |
| `frontend/.env.development` | Development base paths (empty, Vite proxy handles routing) |
| `.github/workflows/ci.yml` | CI workflow — tests, lint, tsc on PRs and main |
| `.github/workflows/deploy.yml` | Deploy workflow — build + push images on main |
| `deploy/caddy/docker-compose.yml` | Template for the Caddy stack on the server |
| `deploy/caddy/Caddyfile` | Template for the Caddy routing config |
| `deploy/cart/docker-compose.yml` | Template for the Cart app stack on the server |
| `deploy/cart/.env.example` | Template for the Cart `.env` file |

### On the Server

| File | Purpose |
|------|---------|
| `C:\docker\caddy\docker-compose.yml` | Running Caddy stack config |
| `C:\docker\caddy\Caddyfile` | Running Caddy routing config |
| `C:\docker\cart\docker-compose.yml` | Running Cart stack config |
| `C:\docker\cart\.env` | Environment-specific config (connection string, etc.) |
| `C:\cart-data\cart.db` | SQLite database (bind-mounted into backend container) |
