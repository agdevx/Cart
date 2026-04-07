# Project Status

**Last Updated:** 2026-04-06

## How to Use This File

This is the single source of truth for where the project stands. Read it at the start of every conversation to understand current state.

### Maintenance Rules

- **Update "Last Updated"** whenever you modify this file.
- **Enhancement lifecycle:** Planned → In Progress → Completed. Move rows between sections as work progresses. Add the "Completed" date column when moving to Completed.
- **Completion dates** come from the **git merge date** of the PR that delivered the work (not the spec date or commit date). Use `git log --merges --oneline --date=short` to find them.
- **Test Health** should be updated after running a full test suite when counts change.
- **New planning docs** go in `docs/active/` using the naming convention `YYYY-MM-DD-slug.md`. Each doc has two clearly labeled sections: `## Design Spec` and `## Implementation Plan`. When an enhancement is completed, move its planning doc from `docs/active/` to `docs/archive/`.
- **Links** use relative paths from `.claude/` → `../docs/archive/filename.md`.

---

## Test Health

| Suite              | Tests | Files                      |
| ------------------ | ----- | -------------------------- |
| Backend — Data     | 70    | AGDevX.Cart.Data.Tests     |
| Backend — Services | 148   | AGDevX.Cart.Services.Tests |
| Backend — API      | 117   | AGDevX.Cart.Api.Tests      |
| Backend — Auth     | 22    | AGDevX.Cart.Auth.Tests     |
| Frontend — Vitest  | 588   | 90 test files              |

## Known Issues / Tech Debt

- No CI/CD pipeline (`.github/workflows/` has CI + deploy workflows, pending first merge to main)
- BaseEntity audit FK Restrict cascades (CreatedBy/ModifiedBy → User) are not configured in DbContext — user deletion is already blocked by other Restrict FKs, so this is a documentation gap, not a functional one

---

## Planned Enhancements

| Enhancement               | Planning Doc                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Contributor/SSE Epic      | No planning doc yet (trip collaborator UX, SSE visibility filtering deferred from single-household migration, SSE heartbeat needed for Cloudflare Tunnel — 100s idle timeout kills connections without keepalive) |
| Home Page — Trip Templates | No planning doc yet                                                                                                              |
| Camera / Barcode Scanning | No planning doc yet                                                                                                             |
| Inventory Categories      | No planning doc yet                                                                                                             |
| Container Image Versioning | No planning doc yet (review tagging strategy for Docker Hub images)                                                             |
| Container Health Checks   | No planning doc yet (Docker HEALTHCHECK in Dockerfiles + depends_on conditions)                                                 |

## In Progress Enhancements

| Enhancement       | Planning Doc                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Cloudflare Tunnel Migration | [docs/active/2026-03-31-cloudflare-tunnel.md](../docs/active/2026-03-31-cloudflare-tunnel.md) |

## Completed Enhancements

| Enhancement                                                | Completed  | Planning Doc                                                                                                                            |
| ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Backend MVP (Phases 1–6)                                   | 2026-01-25 | [docs/archive/2026-01-25-cart-mvp-implementation.md](../docs/archive/2026-01-25-cart-mvp-implementation.md)                             |
| Frontend PWA (Phases 7–8)                                  | 2026-01-31 | [docs/archive/2026-01-31-frontend-pwa.md](../docs/archive/2026-01-31-frontend-pwa.md)                                                   |
| Registration Page                                          | 2026-02-15 | [docs/archive/2026-02-15-registration-page.md](../docs/archive/2026-02-15-registration-page.md)                                         |
| Cookie Auth Migration                                      | 2026-02-22 | [docs/archive/2026-02-22-cookie-auth-migration.md](../docs/archive/2026-02-22-cookie-auth-migration.md)                                 |
| Household Management                                       | 2026-02-22 | [docs/archive/2026-02-22-household-management.md](../docs/archive/2026-02-22-household-management.md)                                   |
| Store Management UI                                        | 2026-02-23 | [docs/archive/2026-02-23-store-management-ui.md](../docs/archive/2026-02-23-store-management-ui.md)                                     |
| Filtered Inventory Views                                   | 2026-03-01 | [docs/archive/2026-03-01-filtered-inventory-views.md](../docs/archive/2026-03-01-filtered-inventory-views.md)                           |
| Household Edit & Delete                                    | 2026-03-01 | [docs/archive/2026-03-01-household-edit-delete.md](../docs/archive/2026-03-01-household-edit-delete.md)                                 |
| Trip Edit, Delete & Reopen                                 | 2026-03-01 | [docs/archive/2026-03-01-trip-edit-delete-reopen.md](../docs/archive/2026-03-01-trip-edit-delete-reopen.md)                             |
| Trip Item Edit & Remove                                    | 2026-03-01 | [docs/archive/2026-03-01-trip-item-edit-remove.md](../docs/archive/2026-03-01-trip-item-edit-remove.md)                                 |
| App Improvements Round 1                                   | 2026-03-08 | [docs/archive/2026-03-08-app-improvements-round1.md](../docs/archive/2026-03-08-app-improvements-round1.md)                             |
| App Improvements Round 2                                   | 2026-03-09 | [docs/archive/2026-03-09-app-improvements-round2.md](../docs/archive/2026-03-09-app-improvements-round2.md)                             |
| App Improvements Round 3                                   | 2026-03-10 | [docs/archive/2026-03-09-app-improvements-round3.md](../docs/archive/2026-03-09-app-improvements-round3.md)                             |
| Security Hardening                                         | 2026-03-11 | [docs/archive/2026-03-10-security-hardening.md](../docs/archive/2026-03-10-security-hardening.md)                                       |
| Store Uniqueness & Scope Indicators                        | 2026-03-10 | [docs/archive/2026-03-10-store-uniqueness-and-scope-indicators.md](../docs/archive/2026-03-10-store-uniqueness-and-scope-indicators.md) |
| TanStack Query Resilience                                  | 2026-03-11 | [docs/archive/2026-03-10-tanstack-query-resilience.md](../docs/archive/2026-03-10-tanstack-query-resilience.md)                         |
| User Profile Management                                    | 2026-03-10 | [docs/archive/2026-03-10-user-profile-management.md](../docs/archive/2026-03-10-user-profile-management.md)                             |
| UX Polish & Delight                                        | 2026-03-11 | [docs/archive/2026-03-10-ux-polish.md](../docs/archive/2026-03-10-ux-polish.md)                                                         |
| Frontend Quality (Validation, Error Boundary, A11y)        | 2026-03-11 | [docs/archive/2026-03-11-frontend-quality.md](../docs/archive/2026-03-11-frontend-quality.md)                                           |
| Backend Resilience (Timeouts, CancellationToken, /api/v1/) | 2026-03-11 | [docs/archive/2026-03-11-backend-resilience.md](../docs/archive/2026-03-11-backend-resilience.md)                                       |
| Home Page (Greeting, Trip Calendar, Weather, Preferences)  | 2026-03-29 | [docs/archive/2026-03-29-home-page.md](../docs/archive/2026-03-29-home-page.md)                                                         |
| Single Household Architecture                              | 2026-03-31 | [docs/archive/2026-03-30-single-household.md](../docs/archive/2026-03-30-single-household.md)                                           |
| Docker Deployment                                          | 2026-03-31 | [docs/archive/2026-03-28-docker-deployment.md](../docs/archive/2026-03-28-docker-deployment.md)                                         |
| CSV Pantry Import + Package Updates + Database Indexes      | 2026-04-06 | [docs/archive/2026-04-06-csv-pantry-import.md](../docs/archive/2026-04-06-csv-pantry-import.md)                                         |
| Trip Duplication                                           | 2026-04-06 | [docs/archive/2026-04-06-trip-duplication.md](../docs/archive/2026-04-06-trip-duplication.md)                                           |
