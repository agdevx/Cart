# Household Management Design

## Problem

Users cannot join existing households. The frontend has a join page and mutation expecting `POST /api/households/join` with an invite code, but the backend has no such endpoint and no invite code system. This blocks the entire collaboration flow: two users can't share a trip because they can't share a household.

## Solution

Persistent random invite codes on households, plus full member management (view, remove, transfer ownership).

## Data Model

### Household Model Change

Add `InviteCode` property to `Household`:
- 6-character uppercase alphanumeric string (A-Z, 2-9, excluding ambiguous 0/O/1/I/L)
- Generated on household creation
- Unique index in the database
- Owner can regenerate to invalidate old codes

### EF Core Migration

1. Add `InviteCode` column as nullable
2. Backfill existing households with unique random codes
3. Alter column to non-nullable
4. Add unique index

## Backend API Endpoints

### New Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/api/households/join` | Any authenticated user | Join via invite code. Body: `{ inviteCode }`. Returns `Household`. |
| `GET` | `/api/household/{id}/members` | Household member | List members with roles and display names. |
| `DELETE` | `/api/household/{id}/members/{userId}` | Owner or self | Remove member. Owner can remove anyone. Members can remove themselves (leave). Owner cannot self-remove. |
| `PUT` | `/api/household/{id}/owner` | Owner only | Transfer ownership. Body: `{ userId }`. Old owner becomes "member". |
| `POST` | `/api/household/{id}/invite-code` | Owner only | Regenerate invite code. Returns new code. |
| `GET` | `/api/household/{id}/invite-code` | Household member | Get current invite code. |

### Service Layer

New methods on `IHouseholdService`:

- `JoinHousehold(userId, inviteCode)` - Look up household by invite code, add user as "member". Fail if already a member.
- `RemoveMember(requestingUserId, householdId, targetUserId)` - Owner removes member OR member removes self. Owner can't self-remove.
- `TransferOwnership(requestingUserId, householdId, newOwnerUserId)` - Current owner transfers to another member.
- `RegenerateInviteCode(requestingUserId, householdId)` - Owner generates new code.

### Repository Layer

New methods on `IHouseholdRepository`:

- `GetByInviteCode(inviteCode)` - Find household by invite code (includes members).
- `AddMember(householdMember)` - Insert a new HouseholdMember record.
- `RemoveMember(householdId, userId)` - Delete a HouseholdMember record.
- `UpdateMemberRole(householdId, userId, role)` - Change a member's role.

## Frontend

### New Page: Household Detail (`/household/:id`)

- Header: household name
- Invite code card: large, copyable code. Owner sees "Regenerate" button.
- Members list: display name, role badge, join date. Owner sees "Remove" and "Transfer Ownership" buttons. Non-owners see "Leave Household" button.

### New Mutations

| File | Endpoint |
|------|----------|
| `remove-household-member.mutation.ts` | `DELETE /api/household/{id}/members/{userId}` |
| `transfer-household-ownership.mutation.ts` | `PUT /api/household/{id}/owner` |
| `regenerate-invite-code.mutation.ts` | `POST /api/household/{id}/invite-code` |

### New Queries

| File | Endpoint |
|------|----------|
| `use-household-members.query.ts` | `GET /api/household/{id}/members` |
| `use-invite-code.query.ts` | `GET /api/household/{id}/invite-code` |

### Existing Files Changed

- `household-page.tsx` - Household cards become links to `/household/:id`
- `app.tsx` - Add route for `/household/:id`
- `join-household.mutation.ts` - Already correct, no changes needed
- `join-household-page.tsx` - Already correct, no changes needed
- Frontend `Household` model - Add optional `inviteCode` field

## Testing

### Backend (xUnit + Moq)

- HouseholdService: join (success, already member, invalid code), remove (owner removes, self-leave, owner can't self-remove, non-owner can't remove others), transfer (success, not owner, target not member), regenerate (success, not owner)
- HouseholdRepository: all new data methods
- HouseholdController: each new endpoint happy path + auth failures

### Frontend (Vitest + RTL)

- Mutation tests: standard pattern (success, error, query invalidation)
- Query tests: success, no-token disabled, error
- Page test: renders members, owner buttons, non-owner leave button, invite code display
