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

**Cloudflare edge protections.** DDoS protection is on by default (free tier). Bot detection, WAF rules, and rate limiting are available in the Cloudflare dashboard and can be enabled later. These are dashboard settings, not `cloudflared` config.

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

<your-hostname> {
    import cart-routes
}

:80 {
    import cart-routes
}
```

The `<your-hostname>` placeholder in the template must be replaced with the actual hostname (e.g., `cart.example.com`) when deploying. The `(cart-routes)` snippet avoids duplicating the routing logic across both blocks.

- **`<your-hostname>` block** — matches tunnel traffic by `Host` header. When future apps are added, each gets its own hostname block.
- **`:80` block** — matches any request on port 80, enabling local network access at `http://<local-ip>`.

`auto_https` is off because TLS is handled by Cloudflare, not Caddy.

### Cloudflare Tunnel (Locally-Managed)

The tunnel is locally-managed via `config.yml` on the server. `cloudflared` reads the config file and ingress rules locally — the Cloudflare dashboard is not used for tunnel routing.

**`config.yml`:**

```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: <your-hostname>
    service: http://caddy:80
  - service: http_status:404
```

**Tunnel creation** is a one-time CLI operation on the host OS using the `cloudflared` binary. It produces a credentials JSON file (`<tunnel-id>.json`) that authorizes the container to connect to the tunnel.

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

No changes to the Docker images. The existing `agdevx/cart-backend` and `agdevx/cart-frontend` images work as-is. The `cloudflared/cloudflared` official image is used directly — no custom build.

### Compose File Changes

**`deploy/cloudflared/docker-compose.yml`** (new):

```yaml
services:
  cloudflared:
    image: cloudflared/cloudflared:latest
    command: tunnel run
    volumes:
      - ./config.yml:/etc/cloudflared/config.yml:ro
      - ./<tunnel-id>.json:/etc/cloudflared/<tunnel-id>.json:ro
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
C:\docker\cloudflared\<tunnel-id>.json
```

Copy `docker-compose.yml` and `config.yml` from `deploy/cloudflared/` in the repo. Replace placeholders with your tunnel ID and hostname. Copy the `<tunnel-id>.json` credentials file from `~/.cloudflared/`.

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

### Documentation Updates

- **`docs/DEPLOYMENT.md`** — rewrite to reflect Cloudflare Tunnel architecture, remove Tailscale references as the access method, update architecture diagram, setup steps, troubleshooting
- **`.claude/STATUS.md`** — update when complete

## Implementation Plan

_To be written after design approval._
