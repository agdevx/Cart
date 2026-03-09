# App Improvements Round 2 — Design

## Overview

18 changes identified from a second manual app walkthrough. Mix of bug fixes, UI consistency improvements, new features, and backend changes.

## Branch

Working on: `feat/app-improvements-round1` (will continue on same branch or create new one)

## Previous Round (Completed)

Round 1 completed 8 tasks with 10 commits. All 285 frontend tests + 93 backend service tests passing. Key changes: fixed store creation 401, renamed inventory→pantry, bottom nav on all auth screens, custom ScopeSelect dropdown, trip post-creation navigation, styled confirm dialog, household card members, redesigned add-items page.

---

## Changes

### 1. Bug: 401 on Store Update + Full Auth Audit

**Problem:** Store name edit (save/checkmark) returns 401. Same class of bug as round 1's store creation 401.

**Investigation needed:** Check `StoreService.UpdateStore` — it calls `GetById(store.Id, userId)` which reads from DB (should work), then `storeRepository.Update(store)` with the request body. The request body `store` object may have `UserId = null` since frontend only sends `{ id, name }`. Check if the repository update overwrites UserId.

Also check the frontend `update-store.mutation.ts` to see exactly what's sent.

**Audit ALL services:** Verify every Create/Update method in StoreService, InventoryService, TripService, TripItemService, HouseholdService handles the case where the frontend doesn't send ownership fields. Per the explore agent: only StoreService had the pattern issue. But verify Update paths too.

**Fix approach:** Either auto-assign userId in UpdateStore (like CreateStore), or change the update to only modify specific fields (name) rather than replacing the whole entity.

### 2. UX: Add-Items Flow Rework

**Current:** "Start Shopping" button on add-items page batch-adds items and navigates to active trip page.

**New:** Replace "Start Shopping" with "Add Items" button that batch-adds items and returns to trip detail page (`/shopping/:tripId`). Trip detail remains the hub where user can add more items or start shopping.

**Files:** `frontend/src/pages/add-trip-items-page.tsx`
- Change button label from "Start Shopping (N items)" to "Add Items (N items)"
- Change post-add navigation from `/shopping/:tripId/active` to `/shopping/:tripId`
- Update tests

### 3. UI: Household Card Members — Exclude Self

**Current:** Shows all member names including yourself.

**New:** Only show names of OTHER members. If you're the only member, show nothing.

**Files:** `frontend/src/pages/household-page.tsx` — the `HouseholdMembersList` component
- Import `useAuth` to get current user ID
- Filter out current user from members list
- If filtered list is empty, return null

### 4. Feature: Settings Page + Nav Item

**New page:** `frontend/src/pages/settings-page.tsx`
- Simple page with "Settings" heading
- Logout button (move from household page)

**Bottom nav update:** `frontend/src/features/bottom-nav/bottom-nav.tsx`
- Add Settings tab as rightmost (4th) item
- Icon: Settings/Gear from Lucide (`Settings` icon)
- Route: `/settings`

**Household page:** `frontend/src/pages/household-page.tsx`
- Remove logout button from header

**App routes:** `frontend/src/app.tsx`
- Add `/settings` route

### 5. Backend: Cascade Delete Household Items & Stores

**Problem:** When a household is deleted, its inventory items and stores are orphaned.

**Fix:** Add cascade delete relationships in `CartDbContext.cs`:

```csharp
modelBuilder.Entity<InventoryItem>(entity =>
{
    entity.HasOne(i => i.Household)
          .WithMany()
          .HasForeignKey(i => i.HouseholdId)
          .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<Store>(entity =>
{
    entity.HasOne(s => s.Household)
          .WithMany()
          .HasForeignKey(s => s.HouseholdId)
          .OnDelete(DeleteBehavior.Cascade);
});
```

Need a new EF migration for this.

### 6. UI: Delete Household Modal Warning

**Current:** Generic delete confirmation.

**New:** Update message to warn about cascading deletes: "This will permanently delete the household and all its items and stores. This can't be undone."

**File:** `frontend/src/pages/household-detail-page.tsx` — update ConfirmDialog message

### 7. UI: Danger Zone Accordion

**Current:** Danger Zone section is always visible on household detail page.

**New:** Wrap in a collapsible accordion. Closed by default. Click to expand/reveal the delete button.

**File:** `frontend/src/pages/household-detail-page.tsx`
- Add toggle state for accordion
- Chevron icon that rotates when expanded
- Smooth height transition

### 8. Rename: DisplayName → Name

**Scope:**

Backend:
- `backend/AGDevX.Cart.Data/Models/User.cs` — rename `DisplayName` to `Name`
- All DTOs/request/response models that reference DisplayName
- All services, controllers, tests
- New EF migration to rename the column
- `backend/AGDevX.Cart.Shared/` — check for DTOs

Frontend:
- Register page label: "Display Name" → "Name"
- All model types referencing `displayName` → `name`
- The `User` model, auth response, anywhere `displayName` is used
- Household member display (uses `user?.displayName`)

### 9. Feature: Default Store on Pantry Items

**The `DefaultStoreId` already exists on the InventoryItem model.** No backend schema change needed.

Frontend:
- `frontend/src/pages/add-pantry-item-page.tsx` — add a store dropdown (only if user has stores defined)
- Use existing `useStoresQuery` to fetch stores
- Add `defaultStoreId` to the create mutation request
- Frontend model `inventory-item.ts` — add `defaultStoreId` field if not already there

### 10. UI: Store Edit Cancel Button

**Current:** Only a checkmark (save) button when editing store name.

**New:** Add an X/cancel button next to the checkmark.

**File:** `frontend/src/pages/pantry-stores-view.tsx`
- Add cancel button (X icon from Lucide) next to the Check icon
- Wire to existing `handleCancelEdit` function (already exists)

### 11. UI: Store Row Kebab Menu

**Current:** Inline Pencil and Trash2 buttons always visible on store rows.

**New:** Replace with a kebab/three-dot menu that opens a dropdown with "Edit" and "Delete" options. Match the pattern used in TripCard or TripItemRow.

**File:** `frontend/src/pages/pantry-stores-view.tsx`
- Check `trip-card.tsx` or `trip-item-row.tsx` for existing kebab menu pattern
- Replace inline buttons with kebab menu

### 12. UI: Pantry Item Kebab Menu

**Current:** Delete button on pantry items (in `pantry-items-view.tsx`).

**New:** Wrap in kebab menu, matching store row pattern.

**File:** `frontend/src/pages/pantry-items-view.tsx`

### 13. UI: Add Item Button Style

**Current:** "Add Item" is a filled teal button in the page header.

**New:** Match the dashed-border "+ Add Store" button style. Move below the Items/Stores segmented control.

**File:** `frontend/src/pages/pantry-page.tsx`
- Move the Add Item button from header to below the toggle
- Change style to: `w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5`

### 14. UI: Add Items Button on Trip Detail

**Current:** "Add Items" button is a small outlined button next to the Shopping List label.

**New:** Same dashed-border style, positioned below the Shopping List label (not next to it).

**File:** `frontend/src/pages/trip-detail-page.tsx`

### 15. Trip Status Labels + Sections

**Current:** Two sections: "In Progress" (active trips) and "Completed".

**New:** Three sections:
- **In Progress** (top) — trips where `IsStarted = true && IsCompleted = false`
- **Planning** (middle) — trips where `IsStarted = false && IsCompleted = false`
- **Completed** (bottom, in accordion) — trips where `IsCompleted = true`

**Backend changes:**
- Add `IsStarted: bool` and `StartedAt: DateTime?` to Trip model
- Add `POST /api/trip/{id}/start` endpoint
- New EF migration
- Update TripService with `StartTrip` method

**Frontend changes:**
- `frontend/src/pages/shopping-page.tsx` — three-way split + accordion for completed
- `frontend/src/pages/trip-detail-page.tsx` — "Start Shopping" calls the start endpoint before navigating
- Trip model: add `isStarted`, `startedAt` fields
- New mutation: `start-trip.mutation.ts`

### 16. Pantry Page Filter Tabs

**Current:** Dropdown select for filtering items (All, Personal, household options).

**New:** Horizontal tab/toggle component matching the add-items page pattern.

**File:** `frontend/src/pages/pantry-page.tsx`
- Replace `<select>` with horizontal segmented control tabs
- Same pattern as the source filter in `add-trip-items-page.tsx`: bg-bg-warm rounded-xl p-1, teal active state
- Options: "All", "Personal", and one tab per household

### 17. Default Item Type from Pantry Filter

**Current:** Add Item page always defaults to "Personal".

**New:** Pre-select type based on current Pantry page filter. "All" → defaults to "Personal".

**Approach:** Pass filter via URL search params since the app doesn't use location state:
- Navigate: `navigate('/pantry/add?scope=household:${householdId}')`
- Add Item page reads `useSearchParams()` and sets initial `householdId` state

**Files:**
- `frontend/src/pages/pantry-page.tsx` — update Add Item link to include scope param
- `frontend/src/pages/add-pantry-item-page.tsx` — read scope from URL params

### 18. Backend: Default Store Support

**Already exists in the model.** Need to verify:
- The create/update inventory mutation sends `defaultStoreId`
- The API accepts it in the request body
- The frontend model includes it

Check `create-inventory-item.mutation.ts` and the backend controller to confirm the field flows through.

---

## Implementation Order (Recommended)

Group by dependency:

1. **Auth audit + store update fix** (#1) — foundational bug fix
2. **Backend schema changes** (#5 cascade, #8 DisplayName→Name, #15 IsStarted on Trip) — do migrations together
3. **Settings page + nav** (#4) — independent
4. **UI consistency batch** (#10, #11, #12, #13, #14) — all small UI tweaks, can parallelize
5. **Trip status labels** (#15 frontend) — depends on backend IsStarted
6. **Danger Zone accordion + delete warning** (#6, #7) — related, do together
7. **Add-items flow rework** (#2) — small change
8. **Household card members exclude self** (#3) — small change
9. **Default Store UI** (#9, #18) — depends on verifying backend support
10. **Pantry filter tabs** (#16) — independent
11. **Default item type from filter** (#17) — depends on #16
