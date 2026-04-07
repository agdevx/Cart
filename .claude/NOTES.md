# Session Notes

## Current State (2026-04-06)

**Branch:** `new-features` (created off latest `main`)

**What's merged to main already:**
- Required field asterisk feature (adds `required` prop to FormField, coral asterisk via CSS `::after`)
- All planning docs for the three epics below

## Work To Do — Three Epics (in order)

Execute these sequentially. Each must be fully complete before starting the next.

### Epic 1: CSV Pantry Import + Package Updates + Database Indexes
- **Spec:** `docs/active/2026-04-06-csv-pantry-import.md`
- **Plan:** `docs/active/2026-04-06-csv-pantry-import-plan.md`
- Includes: npm updates (except eslint), NuGet updates, DefaultStoreId index, CSV import backend + frontend

### Epic 2: Trip Duplication
- **Spec:** `docs/active/2026-04-06-trip-duplication.md`
- **Plan:** `docs/active/2026-04-06-trip-duplication-plan.md`
- Single `POST /api/v1/trip/{id}/duplicate` endpoint + dialog on TripCard kebab and TripDetailPage

### Epic 3: Contributor/SSE Epic
- **Spec:** `docs/active/2026-04-06-contributor-sse-epic.md`
- **Plan:** `docs/active/2026-04-06-contributor-sse-plan.md`
- Three pieces: SSE heartbeat (60s), SSE on all trip pages, presence indicator ("who's shopping with you")

## Execution Requirements

- **All work on `new-features` branch.** Commit often.
- **For each epic:** Write code + tests → all tests passing → opus 4.6 subagent reviews all work and iterate until both agree → use Chrome DevTools MCP to visually walk through changes and verify they work → fix any issues found → all lint fixed → all TS issues fixed
- **One PR at the very end** after all three epics are complete
- **Be extremely thorough.** August is going to bed and wants this all done by morning.

## Key Project Context

- Windows environment — never use `/dev/null` or `NUL` in bash commands
- `tsc -b --noEmit` is required (plain `tsc --noEmit` checks nothing)
- Import sorting enforced by eslint — use `--fix` to autofix
- Solution file is inside `backend/` — all dotnet commands relative to that
- DLL locks when API is running — stop API before running `dotnet test`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- No co-authorship in commits
- Protected branch hook will block edits on `main` — we're on `new-features` so this won't apply
