# Cloudflare Tunnel Migration

## Design Spec

### Overview

Migrate AGDevX.Cart from Tailscale-only access to a Cloudflare Tunnel, making the app available at `https://cart.<your-domain>` from any device with internet access. The app's existing cookie-based authentication is the only access control — no Cloudflare Access (Zero Trust) layer.

Tailscale remains on the network for other purposes but is no longer the access method for Cart. Local network access is preserved via Caddy's exposed port 80.

### Container Architecture

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

### Security Model

**TLS:** Cloudflare terminates HTTPS at their edge. The `cloudflared` tunnel is encrypted (TLS/QUIC). Traffic from `cloudflared` → Caddy → containers is plain HTTP over the Docker internal network (never leaves the machine). This is the standard pattern — identical to how apps sit behind load balancers at AWS, GCP, etc.

**No HTTPS middleware in the backend.** `UseHttpsRedirection` and `UseHsts` remain removed. The API only receives internal HTTP requests from Caddy. Cloudflare handles "Always Use HTTPS" at the edge.

**No Cloudflare Access.** The app's own login page (cookie-based session auth) is the only authentication layer. Anyone who can reach the URL sees the login page.

**No inbound ports on the server.** `cloudflared` connects outbound to Cloudflare — no firewall/router port forwarding needed. Port 80 is exposed to the local network only (no public exposure without explicit router config).

**Rate limiting.** The backend already enforces rate limiting: 5 requests/min per IP on auth endpoints (login, register, logout) and 60 requests/min per IP globally. This is implemented via ASP.NET's `AddRateLimiter` middleware. No additional rate limiting is needed for the tunnel migration.

**Cookie auth.** The `.Cart.Auth` cookie is configured with `SecurePolicy = SameAsRequest` — the cookie's `Secure` flag matches the request protocol. Over HTTPS (tunnel), the cookie is `Secure`. Over HTTP (local access), it's not. This means login works in both scenarios. `SameSite` is `Lax`, and no explicit `Path` is set (defaults to `/`), so the sub-path removal has no impact on cookies.

**Cloudflare edge protections.** DDoS protection is on by default (free tier). Bot detection, WAF rules, and rate limiting are available in the Cloudflare dashboard and can be enabled later. These are dashboard settings, not `cloudflared` config.

**Search engine crawling.** Both the frontend and backend serve a `robots.txt` that disallows all crawlers. This prevents search engines from indexing the app now that it's publicly accessible.

### Docker Network

All three stacks share a Docker network named `agdevx-internal-docker-network`. Caddy's compose file creates it. The cloudflared and cart stacks join it as `external: true`.

**Startup order:** Caddy stack first (creates the network), then cloudflared and cart in either order.

Containers communicate by Docker service name:
- `cloudflared` → `caddy:80`
- `caddy` → `backend:2946`, `frontend:3750`

### Routing

No path prefix stripping. The `/cart` sub-path from the previous Tailscale-based deployment is removed entirely. The app lives at the root of its subdomain.

- `https://cart.<your-domain>/shopping` → Caddy receives `/shopping` → frontend serves `index.html` (SPA routing)
- `https://cart.<your-domain>/api/v1/items` → Caddy receives `/api/v1/items` → backend handles it
- `https://cart.<your-domain>/js/main-abc123.js` → Caddy receives `/js/main-abc123.js` → frontend serves static file

Caddy routes by path: requests starting with `/api/` go to the backend, everything else goes to the frontend.

### Caddyfile

Caddy uses two site blocks — one for tunnel traffic (matched by hostname) and one for local network access (matched by port). Both share the same routing logic:

```
{
    auto_https off
    admin off
}

(cart-routes) {
    handle /api/* {
        reverse_proxy backend:2946
    }

    handle {
        reverse_proxy frontend:3750
    }
}

http://<your-hostname> {
    import cart-routes
}

:80 {
    import cart-routes
}
```

The `<your-hostname>` placeholder in the template must be replaced with the actual hostname (e.g., `cart.example.com`) when deploying. The `(cart-routes)` snippet avoids duplicating the routing logic across both blocks.

- **`http://<your-hostname>` block** — matches tunnel traffic by `Host` header. The explicit `http://` scheme prevents Caddy from attempting automatic HTTPS certificate provisioning. When future apps are added, each gets its own hostname block.
- **`:80` block** — matches any request on port 80, enabling local network access at `http://<local-ip>`.

`auto_https` is off because TLS is handled by Cloudflare, not Caddy.

### Cloudflare Tunnel (Locally-Managed)

The tunnel is locally-managed via `config.yml` on the server. `cloudflared` reads the config file and ingress rules locally — the Cloudflare dashboard is not used for tunnel routing.

**`config.yml`:**

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: <your-hostname>
    service: http://caddy:80
  - service: http_status:404
```

**Tunnel creation** is a one-time CLI operation on the host OS using the `cloudflared` binary. It produces a credentials JSON file (`<tunnel-id>.json`) in `~/.cloudflared/`. Rename this file to `credentials.json` when copying it to the server — the tunnel ID is already specified in `config.yml`'s `tunnel:` field, so the filename doesn't need to carry it.

**DNS:** A proxied CNAME record in Cloudflare maps the hostname to `<tunnel-id>.cfargotunnel.com`. The orange cloud (proxy) must be on — this is how Cloudflare knows to route traffic through the tunnel.

### Adding Future Apps

With one shared tunnel and Caddy as the router, adding a new app requires:

1. Add an ingress rule in `cloudflared/config.yml` for the new hostname
2. Add a site block in the Caddyfile for the new hostname's routes
3. Add a proxied CNAME DNS record pointing the new hostname to the same tunnel
4. New app's containers join the `agdevx-internal-docker-network`
5. Restart cloudflared and Caddy to pick up config changes

No new tunnels or `cloudflared` containers needed.

### Docker Images

No changes to the Docker images. The existing `agdevx/cart-backend` and `agdevx/cart-frontend` images work as-is. The `cloudflare/cloudflared` official image is used directly — no custom build.

### Compose File Changes

**`deploy/cloudflared/docker-compose.yml`** (new):

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    volumes:
      - ./config.yml:/etc/cloudflared/config.yml:ro
      - ./credentials.json:/etc/cloudflared/credentials.json:ro
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    external: true
```

**`deploy/caddy/docker-compose.yml`** (modified):

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    name: agdevx-internal-docker-network
    driver: bridge
```

**`deploy/cart/docker-compose.yml`** (modified — network rename only):

```yaml
services:
  frontend:
    image: agdevx/cart-frontend:latest
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

  backend:
    image: agdevx/cart-backend:latest
    env_file: .env
    volumes:
      - ${CART_DB_PATH:?Set CART_DB_PATH in .env}:/app/data
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    external: true
```

### CI/CD Pipeline

No changes. The existing `ci.yml` and `deploy.yml` workflows build and push Docker images. How traffic reaches those containers is a server-side concern.

### Code Changes Required

**Minimal.** The sub-path removal was the main code change, and `.env.production` already has the correct values (`VITE_API_BASE_URL=`, `VITE_BASE_PATH=/`). No frontend or backend code changes are needed.

Repo changes are limited to:
- Updated Caddyfile template (remove `uri strip_prefix`, add hostname-based routing)
- Updated Caddy compose template (rename network)
- Updated Cart compose template (rename network)
- New cloudflared compose template
- New `config.yml.example` template
- New `robots.txt` in `frontend/public/` (disallow all crawlers)
- New `robots.txt` endpoint in the backend (disallow all crawlers)
- Updated `docs/DEPLOYMENT.md`

### Server Setup (One-Time)

#### Prerequisites

- Docker Desktop installed and running on the home server
- A domain with DNS managed by Cloudflare (registrar is Cloudflare)
- `cloudflared` CLI installed on the host OS (for tunnel creation only — can be uninstalled after)

#### 1. Create the Tunnel

Run on the host OS:

```bash
cloudflared tunnel login
```

This opens a browser to authenticate with Cloudflare. It creates a `cert.pem` file in `~/.cloudflared/`. The `cert.pem` is only needed for managing tunnels (create/delete) — it does not go on the server or in any container.

```bash
cloudflared tunnel create <tunnel-name>
```

This creates the tunnel in your Cloudflare account and outputs a `<tunnel-id>.json` credentials file in `~/.cloudflared/`. The tunnel ID (a UUID) is shown in the output.

#### 2. Create DNS Record

```bash
cloudflared tunnel route dns <tunnel-name> cart.<your-domain>
```

Or manually in the Cloudflare dashboard: add a proxied CNAME record for `cart.<your-domain>` pointing to `<tunnel-id>.cfargotunnel.com`. The proxy toggle (orange cloud) must be on.

#### 3. Create the Cloudflared Stack

Create the folder and files on the server:

```
C:\docker\cloudflared\docker-compose.yml
C:\docker\cloudflared\config.yml
C:\docker\cloudflared\credentials.json
```

Copy `docker-compose.yml` and `config.yml` from `deploy/cloudflared/` in the repo. Replace placeholders with your tunnel ID and hostname. Copy the `<tunnel-id>.json` credentials file from `~/.cloudflared/` and rename it to `credentials.json`.

#### 4. Update Existing Stacks

Update the Caddy and Cart stacks on the server to use the new network name (`agdevx-internal-docker-network`) and the updated Caddyfile. Copy the updated files from `deploy/caddy/` and `deploy/cart/` in the repo.

#### 5. Restart Everything

Stop existing stacks, then start in order:

```bash
cd C:\docker\caddy
docker compose up -d

cd C:\docker\cloudflared
docker compose up -d

cd C:\docker\cart
docker compose up -d
```

#### 6. Verify

Open `https://cart.<your-domain>` in a browser. You should see the login page with a valid HTTPS certificate. Also verify local access at `http://<local-ip>` from a device on the LAN.

#### 7. Clean Up

The `cloudflared` CLI on the host OS can be uninstalled. Keep `cert.pem` backed up somewhere safe in case you need to create or delete tunnels in the future.

### Troubleshooting

**Tunnel won't connect.** The `cloudflared` container requires outbound internet access to establish the tunnel to Cloudflare's edge. If the server's firewall or router blocks outbound traffic, the tunnel won't establish. Check `docker compose logs cloudflared` for connection errors.

**Login works via tunnel but not locally (or vice versa).** The `.Cart.Auth` cookie uses `SecurePolicy = SameAsRequest`, so it adapts to the protocol. If login fails on one path, check that the backend is receiving requests on the expected protocol.

**Old cached SPA after update.** Hard refresh (Ctrl+Shift+R) or clear browser cache. The PWA service worker may also cache aggressively — check the Application tab in DevTools.

### Documentation Updates

- **`docs/DEPLOYMENT.md`** — rewrite to reflect Cloudflare Tunnel architecture, remove Tailscale references as the access method, update architecture diagram, setup steps, troubleshooting
- **`.claude/STATUS.md`** — update when complete

## Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate AGDevX.Cart from Tailscale-only access to Cloudflare Tunnel with public HTTPS, remove the `/cart` sub-path prefix, and block search engine crawling.

**Architecture:** Cloudflare Tunnel → Caddy reverse proxy → backend/frontend containers. Three independent Docker Compose stacks on a shared Docker network. No sub-path prefix — app lives at root of its subdomain.

**Tech Stack:** Docker, Docker Compose, Caddy, Cloudflare Tunnel (`cloudflared`), Nginx, .NET 10, Vite/React

---

### Task 1: Add Frontend robots.txt

**Files:**
- Create: `frontend/public/robots.txt`

- [ ] **Step 1: Create robots.txt**

Create `frontend/public/robots.txt`:

```
User-agent: *
Disallow: /
```

Files in `frontend/public/` are copied to the build output root by Vite. Nginx will serve this at `/robots.txt` automatically.

- [ ] **Step 2: Verify the file is picked up by the build**

Run from `frontend/`:

```bash
npx vite build
```

Then check the output:

```bash
ls dist/robots.txt
```

Expected: File exists in `dist/`.

- [ ] **Step 3: Commit**

```bash
git add frontend/public/robots.txt
git commit -m "feat: add robots.txt to block search engine crawling"
```

---

### Task 2: Add Backend robots.txt Endpoint

**Files:**
- Modify: `backend/AGDevX.Cart.Api/Program.cs:135`

- [ ] **Step 1: Add the endpoint**

In `backend/AGDevX.Cart.Api/Program.cs`, add a minimal endpoint before the existing `app.MapControllers();` line (line 135):

```csharp
//== Block search engine crawling (defense-in-depth for direct backend access)
app.MapGet("/robots.txt", () => Results.Text("User-agent: *\nDisallow: /\n", "text/plain"));
```

In the normal architecture, `/robots.txt` requests go to the frontend (Caddy only routes `/api/*` to the backend). This endpoint is defense-in-depth — it only fires if someone accesses the backend directly, bypassing Caddy.

- [ ] **Step 2: Run backend tests**

Run from `backend/`:

```bash
dotnet test
```

Expected: All tests pass (no existing tests affected).

- [ ] **Step 3: Commit**

```bash
git add backend/AGDevX.Cart.Api/Program.cs
git commit -m "feat: add robots.txt endpoint to backend API"
```

---

### Task 3: Update Caddyfile Template

**Files:**
- Modify: `deploy/caddy/Caddyfile`

- [ ] **Step 1: Replace the Caddyfile**

Replace the entire contents of `deploy/caddy/Caddyfile` with:

```
{
	auto_https off
	admin off
}

(cart-routes) {
	handle /api/* {
		reverse_proxy backend:2946
	}

	handle {
		reverse_proxy frontend:3750
	}
}

http://<your-hostname> {
	import cart-routes
}

:80 {
	import cart-routes
}
```

- [ ] **Step 2: Commit**

```bash
git add deploy/caddy/Caddyfile
git commit -m "refactor: simplify Caddyfile for root-path hosting with hostname routing"
```

---

### Task 4: Update Caddy Compose Template

**Files:**
- Modify: `deploy/caddy/docker-compose.yml`

- [ ] **Step 1: Replace the compose file**

Replace the entire contents of `deploy/caddy/docker-compose.yml` with:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    name: agdevx-internal-docker-network
    driver: bridge
```

Changes from the previous version:
- Network renamed from `proxy` to `agdevx-internal-docker-network`

- [ ] **Step 2: Commit**

```bash
git add deploy/caddy/docker-compose.yml
git commit -m "refactor: rename Docker network to agdevx-internal-docker-network"
```

---

### Task 5: Update Cart Compose Template

**Files:**
- Modify: `deploy/cart/docker-compose.yml`

- [ ] **Step 1: Replace the compose file**

Replace the entire contents of `deploy/cart/docker-compose.yml` with:

```yaml
services:
  frontend:
    image: agdevx/cart-frontend:latest
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

  backend:
    image: agdevx/cart-backend:latest
    env_file: .env
    volumes:
      - ${CART_DB_PATH:?Set CART_DB_PATH in .env}:/app/data
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    external: true
```

Changes from the previous version:
- Network renamed from `proxy` to `agdevx-internal-docker-network`

- [ ] **Step 2: Commit**

```bash
git add deploy/cart/docker-compose.yml
git commit -m "refactor: rename Docker network to agdevx-internal-docker-network"
```

---

### Task 6: Add Cloudflared Compose and Config Templates

**Files:**
- Create: `deploy/cloudflared/docker-compose.yml`
- Create: `deploy/cloudflared/config.yml.example`

- [ ] **Step 1: Create the compose file**

Create `deploy/cloudflared/docker-compose.yml`:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel run
    volumes:
      - ./config.yml:/etc/cloudflared/config.yml:ro
      - ./credentials.json:/etc/cloudflared/credentials.json:ro
    networks:
      - agdevx-internal-docker-network
    restart: unless-stopped

networks:
  agdevx-internal-docker-network:
    external: true
```

- [ ] **Step 2: Create the config template**

Create `deploy/cloudflared/config.yml.example`:

```yaml
# Cloudflare Tunnel configuration
# Copy this file to config.yml and replace placeholders with your values.
#
# To find your tunnel ID:
#   cloudflared tunnel list
#
# The credentials.json file is produced by:
#   cloudflared tunnel create <tunnel-name>
# Rename the output file (<tunnel-id>.json) to credentials.json.

tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: <your-hostname>
    service: http://caddy:80
  - service: http_status:404
```

- [ ] **Step 3: Commit**

```bash
git add deploy/cloudflared/
git commit -m "feat: add cloudflared Docker Compose and config templates"
```

---

### Task 7: Rewrite DEPLOYMENT.md

**Files:**
- Modify: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Replace DEPLOYMENT.md**

Replace the entire contents of `docs/DEPLOYMENT.md`. This is a full rewrite — the previous version described Tailscale-based access with `/cart` sub-path routing, which no longer applies.

The new DEPLOYMENT.md should mirror the structure of the design spec's sections. Use these sections from this document as the source of truth for content:

- **Architecture Overview** — use the "Container Architecture" diagram and "How Requests Flow" sections from the design spec. Add a "Why This Architecture" subsection covering: public HTTPS with zero cert management, no inbound ports, local fallback via port 80, Caddy as shared infrastructure, container isolation.
- **Components** — one subsection each for: Cloudflare Tunnel (cloudflared), Caddy (Reverse Proxy), Frontend (Nginx + SPA), Backend (.NET API), Docker Network. Pull details from the design spec's corresponding sections.
- **CI/CD Pipeline** — copy from the existing DEPLOYMENT.md (this section is unchanged). Includes: How It Works diagram, Triggers table, Image Tags, Required GitHub Secrets.
- **Server Setup (One-Time)** — use the "Server Setup" section from the design spec. Steps: Create the Tunnel, Create DNS Record, Create the Database Folder, Create the Caddy Stack, Create the Cloudflared Stack, Create the Cart Stack, Verify, Clean Up.
- **Updating the Application** — copy from the existing DEPLOYMENT.md (unchanged).
- **Rolling Back** — copy from the existing DEPLOYMENT.md (unchanged).
- **Adding Future Apps** — use the "Adding Future Apps" section from the design spec. Show config.yml ingress example, Caddyfile site block example, DNS record, network join, restart commands.
- **Database** — copy from the existing DEPLOYMENT.md (unchanged, except update network name references if any).
- **Troubleshooting** — use the "Troubleshooting" section from the design spec. Add the existing DEPLOYMENT.md's troubleshooting items that still apply.
- **File Reference** — update to include the new cloudflared files. Two tables: "In the Repo" and "On the Server".

All code blocks must use proper triple-backtick fencing. Replace all `<your-hostname>` and `<tunnel-id>` placeholders consistently. Remove all Tailscale references. Replace `proxy` network name with `agdevx-internal-docker-network` everywhere.

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: rewrite DEPLOYMENT.md for Cloudflare Tunnel architecture"
```

---

### Task 8: Update STATUS.md

**Files:**
- Modify: `.claude/STATUS.md`

- [ ] **Step 1: Move Docker Deployment to Completed and add Cloudflare Tunnel entry**

In `.claude/STATUS.md`, move the "Docker Deployment" row from the "In Progress Enhancements" table to the "Completed Enhancements" table. Use the merge date of the PR that delivers this work for the "Completed" column.

Then verify there are no stale references — the Docker Deployment planning doc should be moved from `docs/active/` to `docs/archive/`.

- [ ] **Step 2: Move planning docs**

Move the Docker deployment docs to the archive (they're for the completed Tailscale-based deployment):

```bash
git mv docs/active/2026-03-28-docker-deployment.md docs/archive/
git mv docs/active/2026-03-28-docker-deployment-plan.md docs/archive/
```

The Cloudflare Tunnel doc (`docs/active/2026-03-31-cloudflare-tunnel.md`) stays in `active/` until this work is complete, then moves to `archive/`.

- [ ] **Step 3: Commit**

```bash
git add .claude/STATUS.md docs/active/ docs/archive/
git commit -m "docs: update STATUS.md, archive Docker deployment docs"
```

---

### Task 9: Run Full Test Suite and Verify

- [ ] **Step 1: Run backend tests**

Run from `backend/`:

```bash
dotnet test
```

Expected: All tests pass.

- [ ] **Step 2: Run frontend tests**

Run from `frontend/`:

```bash
npx vitest run
```

Expected: All tests pass.

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
