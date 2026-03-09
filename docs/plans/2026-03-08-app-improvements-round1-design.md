# App Improvements Round 1 — Design

## Overview

Eight changes identified from a manual app walkthrough: one bug fix, four UI improvements, one UX improvement, one feature redesign, and one rename.

## Changes

### 1. Bug: 401 on Store Creation

Store creation returns 401 despite being authenticated and other endpoints working. Investigate backend `StoreController.Create` — likely a missing/misconfigured auth attribute or authorization check specific to the store endpoint. Fix is backend-side.

### 2. UI: Item Type Description Styling

Parenthetical text like "(Household)" in item type selectors should be visually muted (lighter grey) to indicate it's a description, not part of the name. Native `<option>` elements can't support mixed-color text, so this requires a lightweight custom dropdown component that renders each option with the name in normal color and the description in `text-text-tertiary`.

### 3. UX: Navigate to Trip After Creation

After `createTripMutation.mutateAsync()` succeeds, navigate to `/shopping/{newTripId}` (the trip detail page) instead of staying on the shopping list page. The mutation response includes the new trip's ID.

### 4. Feature: Redesign Add-Items-to-Shopping-List

Replace the current one-at-a-time add-item form on TripDetailPage with a dedicated full-screen page.

- **Route**: `/shopping/:tripId/add-items`
- **Layout**: Search bar at top, source toggle below (same tab pattern as Items/Stores on the Pantry page), scrollable item list
- **Toggle options**: "All", "Personal", and each household the user belongs to
- **Each row**: Item name, type badge, select indicator, quantity input (default 1, visible when selected)
- **Filtering**: Items already on the trip are excluded
- **Bottom**: Sticky "Start Shopping" button — batch-adds all selected items, then navigates to the active trip page
- **Empty state**: "No items match your search" when filter yields nothing

### 5. UI: Styled Confirmation Modal for Incomplete Trip

Replace native `confirm()` in `active-trip-page.tsx` with the existing `ConfirmDialog` component. Copy: "It looks like you may have missed some items. Are you sure you want to complete your trip?" Buttons: "Complete Anyway" / "Keep Shopping".

### 6. UI: Bottom Nav on All Authenticated Screens

Move `<BottomNav />` from the per-route `LayoutWithNav` wrapper into the authenticated layout so it renders on every authenticated page. Login and register pages remain without it.

### 7. Rename: Inventory → Pantry

Frontend-only terminology change:
- Routes: `/inventory` → `/pantry`, `/inventory/add` → `/pantry/add`
- File renames: files referencing "inventory" in the pages/components layer
- Component/hook/variable renames in the UI layer
- Backend API routes (`/api/inventory/...`) stay unchanged
- Bottom nav already says "Pantry"

### 8. UI: Household Card — Members Instead of Date

Replace `Created: {date}` on household cards with member names. Fetch members for each household on the list page using the existing members endpoint. Display as comma-separated names (e.g., "August, Sarah, Mike").
