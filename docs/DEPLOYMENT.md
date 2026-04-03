# Deployment Guide

Guide for deploying AGDevX.Cart to a home server using Cloudflare Tunnel for public HTTPS access.

## Architecture Overview

Four containers across three Docker Compose stacks:

```
Internet
    │
    ▼ (HTTPS)
Cloudflare Edge (DDoS, bot protection, TLS termination)
    │
    ▼ (encrypted tunnel)
┌──────────────────────────────────────────────────────────┐
│  Home Server (Docker Desktop, Windows 11)                │
│                                                          │
│  ┌──────────────────┐  cloudflared stack                 │
│  │  cloudflared     │                                    │
│  │  (tunnel agent)  │                                    │
│  │  no exposed ports│                                    │
│  └──────┬───────────┘                                    │
│         │ HTTP via agdevx-internal-docker-network         │
│  ┌──────┴───────────────────────┐  caddy stack           │
│  │  Caddy (reverse proxy)       │                        │
│  │  Port 80 (local access)      │                        │
│  └──────┬───────────────┬───────┘                        │
│         │               │                                │
│      /api/*           /*                                 │
│         │               │                                │
│  ┌──────┴──────┐  ┌─────┴──────────┐  cart stack         │
│  │  Backend    │  │  Frontend      │                     │
│  │  .NET 10   │  │  Nginx         │                     │
│  │  Port 2946 │  │  Port 3750     │                     │
│  └──────┬─────┘  └────────────────┘                     │
│         │                                                │
│    ┌────┴─────┐                                          │
│    │ cart.db  │  bind mount                              │
│    └──────────┘                                          │
└──────────────────────────────────────────────────────────┘
```

### How Requests Flow

**Via Cloudflare Tunnel (primary — any device, anywhere):**

1. Browser requests `https://cart.<your-domain>/shopping`
2. Cloudflare Edge terminates TLS using a cert it manages. Browsers see a valid, trusted HTTPS connection.
3. Cloudflare routes the request through the encrypted tunnel to `cloudflared` on the home server
4. `cloudflared` forwards the HTTP request to Caddy (via Docker network)
5. Caddy routes by path: `/api/*` → backend on port 2946, everything else → frontend (Nginx) on port 3750
6. Response travels back the same path

**Via local network (fallback — LAN only):**

1. Browser on the local network requests `http://<local-ip>/shopping`
2. Request hits Caddy directly on port 80 (the only exposed port)
3. Same routing as above from step 5

### Why This Architecture

- **Public HTTPS with zero cert management.** Cloudflare terminates TLS at their edge and manages the certificate. No Let's Encrypt, no cert renewal, no HTTPS configuration in Caddy or the backend.
- **No inbound ports on the server.** `cloudflared` connects outbound to Cloudflare — no firewall or router port forwarding needed. The server is not directly reachable from the internet.
- **Local fallback via port 80.** Caddy exposes port 80 to the LAN, so the app works on the local network if the internet is down or the tunnel is unreachable.
- **Caddy is shared infrastructure.** Future apps get a new hostname block in the Caddyfile and an ingress rule in `cloudflared`'s config — no new tunnels or reverse proxies needed.
- **Container isolation.** Only Caddy is exposed to the host network. The backend and frontend are only reachable through Caddy via Docker's internal network.

## Components

### Cloudflare Tunnel (cloudflared)

- Official `cloudflare/cloudflared:latest` image — no custom build needed
- Connects outbound to Cloudflare's edge over an encrypted TLS/QUIC tunnel
- No exposed ports — all connectivity is initiated from inside the container
- Reads routing rules from a local `config.yml` (locally-managed tunnel, not dashboard-managed)
- Forwards matched requests to Caddy over the Docker internal network
- Runs in its own Docker Compose stack alongside its config and credentials files

### Caddy (Reverse Proxy)

- Official `caddy:2-alpine` image — no custom build needed
- Owns port 80 on the host (local network access)
- Routes requests by path: `/api/*` → backend, everything else → frontend
- Uses a `(cart-routes)` snippet in the Caddyfile so the same routing logic is shared between the hostname-matched block (tunnel traffic) and the port-matched block (local traffic)
- `auto_https` is disabled — TLS is handled by Cloudflare, not Caddy
- Runs in its own Docker Compose stack; creates the shared Docker network

### Frontend (Nginx + SPA)

- Custom image: `agdevx/cart-frontend` on Docker Hub
- Multi-stage Docker build: Node builds the SPA, Nginx Alpine serves the output
- Nginx listens on port 3750 (internal only)
- Handles SPA client-side routing by falling back to `index.html` for unknown paths
- The production build bakes in `VITE_API_BASE_URL=` (empty, root-relative) and `VITE_BASE_PATH=/`

### Backend (.NET API)

- Custom image: `agdevx/cart-backend` on Docker Hub
- Multi-stage Docker build: .NET SDK builds and publishes, ASP.NET runtime runs the app
- Listens on port 2946 (internal only)
- SQLite database stored at `/app/data/cart.db` inside the container, mapped to a host folder via bind mount
- Database migrations run automatically on startup
- Configuration via environment variables (connection string, environment name)
- `UseHttpsRedirection` and `UseHsts` are not used — the API only receives internal HTTP requests from Caddy

### Docker Network

All three stacks share a Docker network named `agdevx-internal-docker-network`. The Caddy stack creates it; the cloudflared and cart stacks join it as `external: true`.

**Startup order:** Caddy stack first (creates the network), then cloudflared and cart in either order.

Containers communicate by Docker service name:

- `cloudflared` → `caddy:80`
- `caddy` → `backend:2946`, `frontend:3750`

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
- A domain with DNS managed by Cloudflare (registrar is Cloudflare)
- `cloudflared` CLI installed on the host OS (for tunnel creation only — can be uninstalled after)

### 1. Create the Tunnel

Run on the host OS:

```bash
cloudflared tunnel login
```

This opens a browser to authenticate with Cloudflare. It creates a `cert.pem` file in `~/.cloudflared/`. The `cert.pem` is only needed for managing tunnels (create/delete) — it does not go on the server or in any container.

```bash
cloudflared tunnel create <tunnel-name>
```

This creates the tunnel in your Cloudflare account and outputs a `<tunnel-id>.json` credentials file in `~/.cloudflared/`. The tunnel ID (a UUID) is shown in the output.

### 2. Create DNS Record

```bash
cloudflared tunnel route dns <tunnel-name> cart.<your-domain>
```

Or manually in the Cloudflare dashboard: add a proxied CNAME record for `cart.<your-domain>` pointing to `<tunnel-id>.cfargotunnel.com`. The proxy toggle (orange cloud) must be on.

### 3. Create the Database Folder

Create a folder on the server where the SQLite database will live. This folder should be in a location covered by your backup tooling.

```
C:\cart-data\
```

### 4. Create the Caddy Stack

Create a folder for the Caddy configuration:

```
C:\docker\caddy\docker-compose.yml
C:\docker\caddy\Caddyfile
```

Copy the contents from `deploy/caddy/` in the repo. Replace `<your-hostname>` in the Caddyfile with the actual hostname (e.g., `cart.example.com`).

Start Caddy from a terminal:

```bash
cd C:\docker\caddy
docker compose up -d
```

This creates the shared `agdevx-internal-docker-network` and starts the Caddy container.

### 5. Create the Cloudflared Stack

Create a folder for the cloudflared configuration:

```
C:\docker\cloudflared\docker-compose.yml
C:\docker\cloudflared\config.yml
C:\docker\cloudflared\credentials.json
```

Copy `docker-compose.yml` from `deploy/cloudflared/` in the repo. Copy `config.yml.example` to `config.yml` and replace `<tunnel-id>` and `<your-hostname>` with your values. Copy the `<tunnel-id>.json` credentials file from `~/.cloudflared/` and rename it to `credentials.json`.

Start cloudflared:

```bash
cd C:\docker\cloudflared
docker compose up -d
```

### 6. Create the Cart Stack

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

`CART_DB_PATH` is the Windows folder you created in step 3. This gets bind-mounted into the backend container at `/app/data/`.

Start the Cart stack:

```bash
cd C:\docker\cart
docker compose up -d
```

### 7. Verify

Open `https://cart.<your-domain>` in a browser. You should see the login page with a valid HTTPS certificate. Also verify local access at `http://<local-ip>` from a device on the LAN.

### 8. Clean Up

The `cloudflared` CLI on the host OS can be uninstalled. Keep `cert.pem` backed up somewhere safe in case you need to create or delete tunnels in the future.

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

With one shared tunnel and Caddy as the router, adding a new app requires minimal changes — no new tunnels or `cloudflared` containers needed.

**1. Add an ingress rule in `C:\docker\cloudflared\config.yml`:**

```yaml
ingress:
  - hostname: cart.<your-domain>
    service: http://caddy:80
  - hostname: newapp.<your-domain>      # add this
    service: http://caddy:80            # add this
  - service: http_status:404
```

**2. Add a site block in `C:\docker\caddy\Caddyfile`:**

```
http://newapp.<your-domain> {
    handle /api/* {
        reverse_proxy newapp-backend:PORT
    }

    handle {
        reverse_proxy newapp-frontend:PORT
    }
}
```

**3. Add a proxied CNAME DNS record** in the Cloudflare dashboard pointing `newapp.<your-domain>` to the same `<tunnel-id>.cfargotunnel.com`.

**4. Make the new app's containers join the `agdevx-internal-docker-network`:**

```yaml
networks:
  agdevx-internal-docker-network:
    external: true
```

**5. Restart cloudflared and Caddy to pick up config changes:**

```bash
cd C:\docker\cloudflared
docker compose restart

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

### Tunnel won't connect

The `cloudflared` container requires outbound internet access to establish the tunnel to Cloudflare's edge. If the server's firewall or router blocks outbound traffic, the tunnel won't establish. Check `docker compose logs cloudflared` in the cloudflared folder for connection errors.

### App not loading at all

- Verify all three stacks are running: check Docker Desktop or `docker compose ps` in each stack folder
- Verify the Caddy stack started first (it creates the shared network)
- Check cloudflared logs: `docker compose logs cloudflared`

### Login page loads but API calls fail

- Check that the backend container is running and healthy
- Check backend logs: `docker compose logs backend` in the Cart folder
- Verify the `.env` file has the correct connection string

### Login works via tunnel but not locally (or vice versa)

The `.Cart.Auth` cookie uses `SecurePolicy = SameAsRequest`, so it adapts to the protocol. If login fails on one path, check that the backend is receiving requests on the expected protocol.

### Database errors on startup

- Check that `CART_DB_PATH` in `.env` points to an existing folder on the host
- Check that the folder has write permissions
- Check backend logs for migration errors: `docker compose logs backend`

### After updating, old version still showing

- The browser may be serving a cached version of the SPA. Hard refresh (Ctrl+Shift+R) or clear the browser cache.
- The PWA service worker may also cache aggressively — check the Application tab in DevTools.
- Verify the new images were actually pulled: `docker compose pull` in the Cart folder

### Containers keep restarting

- Check logs for crash details: `docker compose logs <service-name>`
- Common causes: missing `.env` file, invalid connection string, bind mount path doesn't exist, credentials file missing or malformed

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
| `deploy/cloudflared/docker-compose.yml` | Template for the cloudflared stack on the server |
| `deploy/cloudflared/config.yml.example` | Template for the cloudflared tunnel config |
| `deploy/cart/docker-compose.yml` | Template for the Cart app stack on the server |
| `deploy/cart/.env.example` | Template for the Cart `.env` file |

### On the Server

| File | Purpose |
|------|---------|
| `C:\docker\caddy\docker-compose.yml` | Running Caddy stack config |
| `C:\docker\caddy\Caddyfile` | Running Caddy routing config |
| `C:\docker\cloudflared\docker-compose.yml` | Running cloudflared stack config |
| `C:\docker\cloudflared\config.yml` | Tunnel routing rules (tunnel ID and ingress) |
| `C:\docker\cloudflared\credentials.json` | Tunnel credentials (keep backed up) |
| `C:\docker\cart\docker-compose.yml` | Running Cart stack config |
| `C:\docker\cart\.env` | Environment-specific config (connection string, etc.) |
| `C:\cart-data\cart.db` | SQLite database (bind-mounted into backend container) |
