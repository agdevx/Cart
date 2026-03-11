# UX Polish & Delight — Design Spec

**Date:** 2026-03-10
**Branch:** `feat/security-hardening` (will need its own branch)
**Scope:** 11 frontend-only improvements — empty states, skeleton loaders, micro-interactions, accessibility, and small UX touches.

## Overview

The app is functional and clean but feels flat. This spec covers a batch of polish items that add personality, improve perceived performance, and close accessibility gaps. All changes are frontend-only, independent of each other, and share a small set of new primitives.

Items 1 (toast system) and 7 (silent mutation error audit) from the original research are excluded — they're covered by the TanStack Query Resilience plan.

## 1. Shared Components & Utilities

### EmptyState Component

**File:** `pages/components/empty-state.tsx` (new)

**Props:**
- `icon` — Lucide icon component (e.g., `ShoppingCart`, `Package`)
- `title` — string (e.g., "No trips yet")
- `subtitle` — optional string (e.g., "Create your first shopping trip to get started")
- `actionLabel` — optional string (e.g., "Create Trip")
- `onAction` — optional callback

**Layout:** Centered flex column:
1. 48px circle with `bg-teal/10`, icon rendered at 24px in teal
2. Bold title (`font-display`, `text-navy`, 17px, `font-bold`)
3. Muted subtitle (`text-text-secondary`, 14px, centered)
4. Optional CTA button (`bg-teal text-white rounded-xl font-display font-bold`)

**Style:** Friendly & helpful — icon in tinted circle, warm headline, helpful subtitle, CTA button. Chosen over minimal and playful options for guidance value without wearing thin.

**Applied in 7 locations:**

| Page | Icon | Title | Subtitle | CTA |
|------|------|-------|----------|-----|
| `shopping-page.tsx` | `ShoppingCart` | No trips yet | Create your first shopping trip to get started | Create Trip (toggles create form) |
| `pantry-items-view.tsx` | `Package` | No inventory items yet | Add your first item to start building your pantry | Add Item (toggles create form) |
| `pantry-stores-view.tsx` | `Package` | No stores yet | Add your first store to organize your shopping | Add Store (toggles create form) |
| `trip-detail-page.tsx` | `ShoppingCart` | No items in this trip | Add some items to get started | Add Items (navigates to add-trip-items) |
| `active-trip-page.tsx` | `ShoppingCart` | No items in this trip | — | — |
| `household-page.tsx` | `Users` | No households yet | Create or join a household to share shopping trips | — |
| `add-trip-items-page.tsx` | `Search` | No items found | Try a different search term | — |

### useFocusTrap Hook

**File:** `hooks/use-focus-trap.ts` (new)

**API:** `useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean)`

**Behavior:**
- When `active` is true, Tab and Shift+Tab cycle through focusable elements within the container
- Focusable elements: `a`, `button`, `input`, `textarea`, `select`, `[tabindex]` — excluding `[disabled]` and `[tabindex="-1"]`
- On activation, focus moves to the first focusable element (caller can override by focusing a specific element after the hook activates)

### CSS Utilities (globals.css)

**Fade-in animation:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
Utility class: `.animate-fade-in { animation: fadeIn 350ms ease-out; }`

### Skeleton Loaders

Replace "Loading..." text with pulse-animated placeholder cards that match the shape of real content. Each page gets skeletons shaped like its actual layout.

**Shared pattern:** Rounded bars with `bg-navy/8 animate-pulse rounded-lg` inside a card container (`bg-surface rounded-2xl shadow-sm`).

**Per-page skeletons:**

| Page | Skeleton shape |
|------|---------------|
| `shopping-page.tsx` | 2 trip cards: 12px title bar (60% width) + 10px subtitle bar (40%) + 8px progress bar (100%), inside `p-4 rounded-2xl` |
| `pantry-items-view.tsx` | 3 item rows: 12px name bar (50%) + 10px notes bar (30%), inside `p-4 rounded-xl`, stacked with 8px gap |
| `pantry-stores-view.tsx` | 2 store rows: 12px name bar (45%) + 10px scope badge (20%), inside `p-4 rounded-xl` |
| `trip-detail-page.tsx` | 1 store accordion header (12px bar, 40%) + 3 item rows (12px + 10px bars) |
| `household-page.tsx` | 2 household cards: 12px name bar (50%) + 10px member count bar (25%), inside `p-5 rounded-2xl` |

**Bar dimensions:** Height 10-12px, rounded-lg, various widths to suggest content variety. Bars use `bg-navy/8` (consistent with the muted palette).

**Placement:** Replaces the existing `<p className="text-text-secondary">Loading...</p>` blocks. Skeleton is shown when `isLoading` is true (same condition as current loading text).

## 2. Micro-interactions & Animations

### Checkbox Bounce (trip-item-row.tsx)

**Trigger:** When a trip item transitions from unchecked → checked.

**Animation:**
- Checkbox: `@keyframes bounce` — scale 1 → 1.25 → 1, 350ms, `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring easing)
- Item name: `::after` pseudo-element strikethrough, `width: 0% → 100%` over 300ms ease-out
- Unchecking is instant (no reverse animation)

### Haptic Feedback (trip-item-row.tsx)

`navigator.vibrate?.(10)` called alongside the check toggle mutation. Feature-detected — no-op on unsupported browsers/devices.

### Confetti on Trip Completion (active-trip-page.tsx)

**Dependency:** `canvas-confetti` `^1.9.0` (~6KB, fire-and-forget API, includes TypeScript types)

**Trigger:** When the complete trip mutation succeeds, before any navigation.

**Effect:** `confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } })` — single burst from lower screen area. No looping.

**Timing:** Fire confetti in the `onSuccess` callback. If the page navigates after completion, delay navigation by ~1.5s so the confetti is visible. If the page stays put (user sees a "completed" state), no delay needed — verify current behavior during implementation.

### Accordion Animation

**Two separate locations:**

**1. `store-accordion.tsx`** — item groups on trip detail and active trip pages. Replace `{isExpanded && <div>{children}</div>}` with the grid-rows technique. Children are always rendered (just visually collapsed), which means list items inside remain mounted. This is acceptable because trip item rows are lightweight and don't run expensive effects.

```tsx
<div className={`grid transition-all duration-200 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
  <div className="overflow-hidden">
    {children}
  </div>
</div>
```

**2. `shopping-page.tsx`** — completed trips section (standalone, not using `StoreAccordion`). Replace `{showCompleted && <div>...</div>}` with the same grid-rows pattern inline. The `showCompleted` state variable and toggle button remain unchanged.

Chevron rotation already works in both locations — no changes needed there.

## 3. Accessibility & Keyboard

### Focus Trap in ConfirmDialog (confirm-dialog.tsx)

- Apply `useFocusTrap` to the dialog container when visible
- On open, focus moves to the Cancel button (safe default — destructive Confirm button should not be auto-focused)
- Tab cycles between Cancel and Confirm buttons

### Escape Key on ConfirmDialog (confirm-dialog.tsx)

- `keydown` listener for Escape calls `onCancel`
- Active only when dialog is open, cleaned up on unmount

### Escape Key on Kebab Menus (4 files)

All kebab menus currently close only on click-outside (mousedown listener). Add Escape key handling:

**Files:**
- `trip-item-row.tsx`
- `pantry-stores-view.tsx`
- `pantry-items-view.tsx`
- `trip-card.tsx`

**Implementation:** Add `keydown` listener for Escape inside the same `useEffect` that handles the mousedown click-outside listener. Escape sets menu state to closed.

## 4. Small UX Touches

### Time-Aware Greeting (shopping-page.tsx only)

**Placement:** Small text line above the page title on the Shopping page only. Other pages keep the current layout.

**Format:** "Good morning, August 👋" (with wave emoji)

**Time bands:**
- Morning: 5:00 AM – 11:59 AM
- Afternoon: 12:00 PM – 4:59 PM
- Evening: 5:00 PM – 4:59 AM

**Styling:** Teal color (`text-teal`), Nunito font, 14px, semibold. Uses `user.name` from auth context (requires adding `useAuth` import to `shopping-page.tsx`).

### Auto-Focus on Form Open (5 locations)

Add `autoFocus` attribute to the first input when create/edit forms toggle visible:

| File | Form | Input |
|------|------|-------|
| `shopping-page.tsx` | Create Trip | Trip name |
| `pantry-stores-view.tsx` | Add Store | Store name |
| `pantry-items-view.tsx` | Add Item | Item name |
| `pantry-items-view.tsx` | Edit Item (inline) | Item name |
| `trip-item-row.tsx` | EditForm | Quantity |

**Already correct (no changes needed):**
- Edit Store form — already has `autoFocus`
- Trip Card edit — uses `useRef` + `useEffect` with select-all

### Page Fade-In (selected pages)

Add `animate-fade-in` CSS class to the outer content wrapper in these page components:
- `shopping-page.tsx`, `pantry-items-view.tsx`, `pantry-stores-view.tsx`
- `trip-detail-page.tsx`, `active-trip-page.tsx`, `add-trip-items-page.tsx`
- `household-page.tsx`, `household-detail-page.tsx`
- `profile-page.tsx`

Uses the `@keyframes fadeIn` defined in globals.css — 350ms opacity-only, ease-out.

**Reduced motion:** All animations (fade-in, checkbox bounce, accordion transitions) respect `prefers-reduced-motion: reduce`. Add a global media query in `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in { animation: none; }
  * { transition-duration: 0.01ms !important; }
}
```

Confetti: `canvas-confetti` has no built-in reduced-motion support. Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before firing.

## 5. Dependencies

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `canvas-confetti` | `^1.9.0` | ~6KB | Trip completion celebration (includes TypeScript types) |

No other new dependencies. Skeletons are pure CSS, focus trap is a custom hook, animations are CSS keyframes + Tailwind, haptic is a native API.

## 6. New Files

| File | Purpose |
|------|---------|
| `pages/components/empty-state.tsx` | Reusable empty state component |
| `hooks/use-focus-trap.ts` | Focus trap hook for modals |

## 7. Modified Files

| File | Changes |
|------|---------|
| `globals.css` | `@keyframes fadeIn`, `.animate-fade-in`, `prefers-reduced-motion` media query |
| `confirm-dialog.tsx` | Focus trap, Escape key handler |
| `trip-item-row.tsx` | Checkbox bounce animation, haptic feedback, Escape on kebab, auto-focus on edit form |
| `active-trip-page.tsx` | Confetti on completion, empty state, fade-in |
| `store-accordion.tsx` | Grid-rows expand/collapse animation (children always rendered) |
| `shopping-page.tsx` | Greeting (adds `useAuth` import), skeleton, empty state, create form auto-focus, fade-in, completed trips accordion animation |
| `pantry-stores-view.tsx` | Empty state, skeleton loader, Escape on kebab, auto-focus, fade-in |
| `pantry-items-view.tsx` | Empty state, skeleton loader, Escape on kebab, auto-focus on create + edit, fade-in |
| `trip-detail-page.tsx` | Empty state, skeleton loader, fade-in |
| `household-page.tsx` | Empty state, skeleton loader, fade-in |
| `household-detail-page.tsx` | Fade-in |
| `add-trip-items-page.tsx` | Empty state, fade-in |
| `trip-card.tsx` | Escape on kebab |
| `profile-page.tsx` | Fade-in |

## 8. Testing

| What | How |
|------|-----|
| EmptyState component | Unit test: renders icon, title, subtitle, CTA; fires onAction |
| useFocusTrap hook | Unit test: Tab cycles within container |
| Confetti | Unit test: canvas-confetti called on successful trip completion (mock) |
| ConfirmDialog a11y | Unit test: Escape fires onCancel, Tab stays trapped |
| Kebab Escape (×4) | Unit test per menu: Escape closes menu |
| Greeting | Unit test: correct time-of-day text, uses user name. Test boundary conditions: 4:59 AM→evening, 5:00 AM→morning, 11:59 AM→morning, 12:00 PM→afternoon, 4:59 PM→afternoon, 5:00 PM→evening |
| Skeleton loaders | No dedicated tests (visual-only) |
| Checkbox animation | No dedicated tests (CSS-only, existing tests cover behavior) |
| Auto-focus | Covered by native `autoFocus` — no custom test needed |
| Page fade-in | No dedicated tests (CSS-only) |
