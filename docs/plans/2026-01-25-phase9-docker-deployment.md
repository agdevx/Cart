# Phase 9: Docker & Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Containerize backend and frontend, configure Caddy reverse proxy, create Docker Compose setup for easy deployment.

**Architecture:** Multi-stage Docker builds for optimal image size, Caddy serving static frontend and proxying API, Docker Compose orchestrating all services.

**Tech Stack:** Docker, Docker Compose, Caddy, .NET 10, Node.js

---

## Task 39: Backend Dockerfile

**Files:**
- Create: `Dockerfile` (root)
- Create: `.dockerignore`

**Step 1: Create .dockerignore**

Create `.dockerignore`:
```
.git/
.gitignore
.vs/
.vscode/
.idea/
**/bin/
**/obj/
**/dist/
**/node_modules/
docs/
*.md
!README.md
frontend/
*.db
*.db-shm
*.db-wal
.claude/
```

**Step 2: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
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
RUN dotnet build AGDevX.Cart.Api.csproj -c Release -o /app/build

FROM build AS publish
RUN dotnet publish AGDevX.Cart.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

RUN mkdir -p /app/data

COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/cart.db"

EXPOSE 5000

ENTRYPOINT ["dotnet", "AGDevX.Cart.Api.dll"]
```

**Step 3: Test build**

Run:
```bash
docker build -t agdevx-cart-api:test .
```

Expected: Image builds successfully

**Step 4: Test run**

Run:
```bash
docker run -p 5000:5000 agdevx-cart-api:test
```

Expected: API starts, accessible at http://localhost:5000/api

Stop container (Ctrl+C)

**Step 5: Commit**

Run:
```bash
git add .
git commit -m "feat: add multi-stage Dockerfile for backend API"
```

Expected: Commit created

---

## Task 40: Frontend Production Build

**Files:**
- Create: `frontend/.dockerignore`
- Create: `frontend/Dockerfile`
- Create: `frontend/.env.production`
- Modify: `frontend/vite.config.ts`

**Step 1: Update Vite config**

Modify `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'state-vendor': ['jotai'],
        },
      },
    },
  },
})
```

**Step 2: Create .env.production**

Create `frontend/.env.production`:
```
VITE_API_URL=/api
```

**Step 3: Create .dockerignore**

Create `frontend/.dockerignore`:
```
node_modules/
dist/
.env
.env.local
*.log
```

**Step 4: Create Dockerfile**

Create `frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
```

**Step 5: Test build**

Run:
```bash
cd frontend
docker build -t agdevx-cart-frontend:test .
```

Expected: Image builds with dist/ folder

**Step 6: Test local build**

Run:
```bash
npm run build
npx serve -s dist -p 3000
```

Expected: Production build serves

**Step 7: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: configure frontend production build"
```

Expected: Commit created

---

## Task 41: Caddy Configuration

**Files:**
- Create: `Caddyfile`
- Create: `caddy/Dockerfile`

**Step 1: Create Caddyfile**

Create `Caddyfile`:
```
{
    auto_https off
    admin off
}

:80 {
    handle /api/* {
        reverse_proxy api:5000
    }

    handle {
        root * /srv
        try_files {path} /index.html
        file_server
    }

    header {
        Permissions-Policy interest-cohort=()
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }

    log {
        output stdout
        format console
    }
}
```

**Step 2: Create Caddy Dockerfile**

Create `caddy/Dockerfile`:
```dockerfile
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
```

**Step 3: Test syntax**

Run:
```bash
docker run --rm -v ${PWD}/Caddyfile:/etc/caddy/Caddyfile caddy:2-alpine caddy fmt --overwrite /etc/caddy/Caddyfile
```

Expected: Caddyfile validated

**Step 4: Commit**

Run:
```bash
git add .
git commit -m "feat: add Caddy configuration for reverse proxy"
```

Expected: Commit created

---

## Task 42: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `.env.example`
- Modify: `README.md`

**Step 1: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agdevx-cart-api
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Data Source=/app/data/cart.db
      - JwtSettings__Secret=${JWT_SECRET}
      - JwtSettings__Issuer=AGDevX.Cart
      - JwtSettings__Audience=AGDevX.Cart.Client
    volumes:
      - cart-data:/app/data
    networks:
      - cart-network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: build
    container_name: agdevx-cart-frontend-builder
    volumes:
      - frontend-dist:/app/dist

  caddy:
    build:
      context: .
      dockerfile: caddy/Dockerfile
    container_name: agdevx-cart-caddy
    ports:
      - "80:80"
    volumes:
      - frontend-dist:/srv:ro
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
    networks:
      - cart-network
    depends_on:
      - api
      - frontend
    restart: unless-stopped

volumes:
  cart-data:
  frontend-dist:

networks:
  cart-network:
    driver: bridge
```

**Step 2: Create dev override**

Create `docker-compose.dev.yml`:
```yaml
services:
  api:
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - JwtSettings__Secret=dev-secret-key-at-least-32-chars-long
    ports:
      - "5000:5000"

  caddy:
    ports:
      - "3000:80"
```

**Step 3: Create .env.example**

Create `.env.example`:
```
JWT_SECRET=your-secret-key-at-least-32-characters-long
```

**Step 4: Test dev mode**

Run:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Expected: All services start, frontend at http://localhost:3000, API at http://localhost:5000

Stop (Ctrl+C)

**Step 5: Test production**

Run:
```bash
docker-compose up --build
```

Expected: Frontend at http://localhost:80

Stop and clean:
```bash
docker-compose down -v
```

**Step 6: Update README**

Modify `README.md` to add deployment section:
```markdown
## Docker Deployment

### Development

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Access:
- Frontend: http://localhost:3000
- API: http://localhost:5000

### Production

Create `.env` file:
```
JWT_SECRET=your-secret-key-at-least-32-characters
```

Run:
```bash
docker-compose up -d
```

Access: http://localhost

### Commands

Stop: `docker-compose down`
View logs: `docker-compose logs -f`
Reset: `docker-compose down -v && docker-compose up --build`
```

**Step 7: Commit**

Run:
```bash
git add .
git commit -m "feat: add Docker Compose orchestration"
```

Expected: Commit created

---

## Phase 9 Complete!

Docker deployment ready with multi-stage builds, Caddy reverse proxy, and easy dev/prod configurations.

**Next:** Phase 10 - Testing & Documentation
