# Trip Editing, Deletion, and Reopening — Design

## Scope

Add three actions to trip cards on the shopping page: **rename**, **delete**, and **reopen**.

## UI Pattern

### Kebab Menu Per Trip Row

A three-dot (`MoreVertical` from Lucide) icon on each trip card. Tapping it opens a dropdown with context-appropriate actions:

- **Active trips**: Rename, Delete
- **Completed trips**: Rename, Reopen, Delete

The kebab sits in the top-right of each trip card. The dropdown appears below/above the icon (position-aware).

### Rename (Inline Edit)

When "Rename" is selected from the kebab menu:

1. The trip name transforms into a text input, pre-filled with the current name, auto-focused with text selected
2. Save on **Enter** or **blur** (if value changed)
3. Cancel on **Escape** (reverts to original name)
4. While saving, the input is disabled with a subtle loading state
5. Calls `PUT /api/trip/{id}` with the updated name

### Delete (Confirmation Dialog)

When "Delete" is selected:

1. A confirmation dialog appears: "Delete *{trip name}*? This can't be undone."
2. Two buttons: **Cancel** (secondary) and **Delete** (destructive/red)
3. Calls `DELETE /api/trip/{id}`
4. On success, the trip disappears from the list via query invalidation

### Reopen

When "Reopen" is selected from a completed trip's kebab menu:

1. No confirmation needed (low-risk, reversible action)
2. Calls `POST /api/trip/{id}/reopen`
3. Trip moves from Completed back to In Progress via query invalidation

## Backend Changes

### UpdateTripRequest DTO

The current `PUT /api/trip/{id}` endpoint accepts a full `Trip` entity with no authorization checks. Changes needed:

- Create an `UpdateTripRequest` DTO with just `Name` (only field editable via this UI)
- Add authorization in the service layer (creator or collaborator can rename)
- Pass userId through from the controller to the service

### Existing Endpoints (No Changes Needed)

- `DELETE /api/trip/{id}` — already has creator-only authorization
- `POST /api/trip/{id}/reopen` — already implemented

## Components

| Component | Purpose |
|---|---|
| `TripKebabMenu` | Three-dot button + dropdown with Rename/Delete/Reopen options |
| `ConfirmDialog` | Reusable confirmation dialog (Cancel + destructive action) |
| Inline edit state | Managed within the shopping page via local state per trip row |

## New Frontend Hooks

| Hook | Endpoint | Purpose |
|---|---|---|
| `useUpdateTripMutation` | `PUT /api/trip/{id}` | Rename a trip |
| `useDeleteTripMutation` | `DELETE /api/trip/{id}` | Delete a trip |
| `useReopenTripMutation` | `POST /api/trip/{id}/reopen` | Reopen a completed trip |
