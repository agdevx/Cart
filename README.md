# AGDevX Cart

Self-hosted grocery shopping list application with real-time collaboration.

## Features
- Household inventory management
- Real-time collaborative shopping trips
- Multi-store support
- Personal and shared items
- PWA with offline support

## Tech Stack
- Backend: .NET 10 + ASP.NET Core Web API
- Frontend: React 19 + TypeScript + Vite
- Database: SQLite
- Real-time: Server-Sent Events (SSE)
- Deployment: Docker + Caddy

## Project Structure

```
AGDevX.Cart/
├── AGDevX.Cart.slnx
├── AGDevX.Cart.Api/          # Controllers, Program.cs, API layer
├── AGDevX.Cart.Services/     # Business logic
├── AGDevX.Cart.Auth/         # Authentication & authorization
├── AGDevX.Cart.Data/         # EF Core, DbContext, repositories
├── AGDevX.Cart.Shared/       # Models, DTOs, interfaces, extensions
└── Tests/
    ├── AGDevX.Cart.Api.Tests/
    ├── AGDevX.Cart.Services.Tests/
    ├── AGDevX.Cart.Auth.Tests/
    └── AGDevX.Cart.Data.Tests/
```

## Getting Started

See docs/plans/ for implementation details.
