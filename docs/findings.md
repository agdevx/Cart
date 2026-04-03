# Exploratory Testing Findings

**Date:** 2026-04-02
**Tester:** Claude (automated exploratory testing)
**Branch:** fix/app-polish-round1

---

## Critical Issues

_None found. All core workflows (register, login, CRUD items/stores/trips, household management, settings) function correctly._

---

## UX Issues

### 1. Danger Zone auto-expands on page load
**Page:** Household
**Observed:** The Danger Zone section appears expanded by default, showing Leave and Delete buttons immediately.
**Expected:** Danger Zone should be collapsed by default and require a click to expand, reducing accidental exposure to destructive actions.

### 2. No confirmation or feedback after saving preferences
**Page:** Settings → Preferences
**Observed:** After clicking Save, the button disappears silently. There's no toast, animation, or visual feedback confirming the save succeeded.
**Expected:** A brief success toast ("Preferences saved") or a checkmark animation would confirm the action completed.

### 3. "Household" appears as a Default Page option even when not in a household
**Page:** Settings → Preferences
**Observed:** The Default Page selector shows Home, Shopping, Pantry, and Household buttons regardless of whether the user is in a household.
**Expected:** The Household option should be hidden (or disabled) when the user has no household, similar to how the Household nav tab is conditional.

### 4. PWA install banner overlaps calendar popover
**Page:** Home
**Observed:** When the "Install Cart" banner is visible and a calendar date is clicked, the popover slides up behind/overlapping the install banner.
**Expected:** The popover should appear above the banner, or the banner should dismiss when the popover opens.

### 5. Empty state on Stores tab says nothing
**Page:** Pantry → Stores (when no stores exist for a scope)
**Observed:** Switching to an empty scope (e.g., Household stores when none exist) shows a blank area with no message.
**Expected:** An empty state message like "No stores yet" with an action to add one, similar to the Items tab empty state.

### 6. No way to navigate back from trip detail page
**Page:** Shopping → Trip Detail
**Observed:** Clicking a trip takes you to the detail page, but there's no back button. The user must use the bottom nav to go back to Shopping.
**Expected:** A back arrow or breadcrumb at the top of the trip detail page.

---

## Visual Issues

### 7. Past date calendar popover is very minimal
**Page:** Home → Calendar (past date)
**Observed:** Clicking a past date shows a small popover with just the date and weather on a single line. The popover feels undersized and vertically unbalanced compared to future date popovers which have the "Plan a trip" button adding height.
**Expected:** Consider a minimum height or centered content to make past date popovers feel more intentional.

### 8. Scope filter tabs can overflow on small screens
**Page:** Pantry
**Observed:** When the household name is long (e.g., "The Test House Household"), the scope filter tabs may overflow horizontally. The tabs don't wrap or scroll.
**Expected:** Horizontal scroll on the filter tabs, or truncation of long household names.

---

## Inconsistencies

### 9. Trip create form shows Scope radio when household exists, but FAB has no scope option
**Page:** Shopping
**Observed:** When creating a trip via FAB, the form shows Personal/Household scope radio buttons. But when planning from the calendar popover, the same form opens with scope pre-selected as Personal.
**Expected:** Both entry points should behave consistently — either both pre-select a scope or both require selection.

### 10. Kebab menu positioning varies
**Page:** Pantry Items, Shopping Trips
**Observed:** The kebab menu (three-dot) dropdown sometimes appears below the button and sometimes above, depending on scroll position. The positioning algorithm works but can feel unpredictable.
**Expected:** Consistent positioning, preferring below unless near the bottom of the viewport.

---

## Minor Observations

### 11. Weather data shows for dates beyond forecast range
**Page:** Home → Calendar
**Observed:** Weather icons and temperatures appear for dates in the past and near future (within forecast range), but dates further out (e.g., April 19+) show no weather data. This is expected behavior (forecast APIs have limited range), but there's no visual distinction between "no weather data available" and "clear/no weather."
**Expected:** This is fine as-is, but a subtle indicator that weather data isn't available for far-future dates could reduce confusion.

### 12. Backend compiler warnings
**Location:** `AGDevX.Cart.Data/Repositories/TripItemRepository.cs` lines 54, 63
**Observed:** CS8602 warnings — "Dereference of a possibly null reference" — appear on every build.
**Expected:** These should be addressed with null checks or null-forgiving operators to keep the build warning-free.

### 13. Location search button stays disabled with empty input
**Page:** Settings → Preferences
**Observed:** The Search button next to the city search input is disabled until text is entered. This is correct behavior, but the disabled styling is very subtle — it looks almost the same as the enabled state.
**Expected:** More visible disabled styling or a placeholder hint like "Type a city name to search."

### 14. No loading indicator when searching for a city
**Page:** Settings → Preferences → Search city
**Observed:** After typing a city and clicking Search, there's no spinner or loading indicator while the geocoding API call is in progress.
**Expected:** The Search button should show a spinner during the API call.
