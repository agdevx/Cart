# Household Editing and Deletion — Design

## Scope

Add rename and delete actions to the household detail page.

## Backend

Already complete — no changes needed:
- `GET /api/household/{id}` — returns single household (member-only)
- `PUT /api/household/{id}` — updates household name (any member), accepts `string` body
- `DELETE /api/household/{id}` — deletes household (owner-only)

## UI Changes (Household Detail Page Only)

### Header — Inline Rename

Replace the hardcoded "Household Details" title with the actual household name. A pencil (`Pencil`) icon sits next to the name.

1. Clicking the pencil turns the name into a text input, pre-filled and auto-focused with text selected
2. Save on **Enter** or **blur** (if value changed)
3. Cancel on **Escape** (reverts to original name)
4. While saving, the input is disabled with a subtle loading state
5. Calls `PUT /api/household/{id}` with the updated name

Any household member can rename.

### Danger Zone — Delete (Owner Only)

At the bottom of the page, below the members list:

1. A red "Delete Household" button, visible only to the owner
2. Clicking shows a confirmation dialog: "Delete *{household name}*? This will remove the household and all members. This can't be undone."
3. Two buttons: **Cancel** (secondary) and **Delete** (destructive/red)
4. Calls `DELETE /api/household/{id}`
5. On success, navigates to `/household`

Uses the existing `ConfirmDialog` component.

## New Frontend Hooks

| Hook | Endpoint | Purpose |
|---|---|---|
| `useHouseholdQuery` | `GET /api/household/{id}` | Fetch single household for name display |
| `useUpdateHouseholdMutation` | `PUT /api/household/{id}` | Rename household |
| `useDeleteHouseholdMutation` | `DELETE /api/household/{id}` | Delete household |

## Pages Affected

- `household-detail-page.tsx` — add household name header with inline rename, danger zone delete section
