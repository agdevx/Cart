# User Profile Management — Design Spec

## Overview

Add the ability for users to change their name, email address, and password from the Settings page.

## Settings Page Layout

iOS-style grouped list with section labels above cards:

- **Profile** — grouped card with Name and Email rows (labels above values), "Edit" link in section header
- **Security** — grouped card with Password row (label above dots), "Change" link inline
- **Logout** — standalone button at the bottom (existing)

### Interaction Rules

- Only one section can be in edit mode at a time
- Switching sections (tapping "Edit" while password is open, or "Change" while profile is open) collapses the other back to view mode and discards any unsaved input
- Cancel returns the section to view mode, discarding changes

## Profile Edit

**View mode:** Labels above values (Name, Email) in grouped rows. "Edit" link in section header.

**Edit mode:** Fields become inputs. Cancel/Save buttons appear (side-by-side, flex-1, cancel left, save right).

**Conditional password field:** The "Current Password" input is hidden by default. It appears (with a dashed border and hint "Required to change your email") only when the email value differs from the original. If the email is reverted to its original value, the password field disappears.

**Validation (matching registration page):**

- Name: required, max 64 characters
- Email: required, valid format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), max 254 characters
- Current password: required only when email is changed

**On save:** Single API call updates name and email. If email changed, backend verifies current password. Session claims and frontend state (Jotai atom + localStorage) are updated without forcing re-login.

## Password Change

**View mode:** Single row showing "Password" label above "••••••••", with "Change" link.

**Edit mode:** Card expands to show three fields:

- Current Password
- New Password (with live requirements checklist matching registration: 8+ chars, one uppercase, one number)
- Confirm New Password

Cancel/Save buttons at the bottom (same pattern).

**Validation (matching registration page):**

- Current password: required
- New password: min 8 chars, max 128 chars, one uppercase letter, one number
- Confirm: must match new password

**On save:** Backend verifies current password, hashes the new one, updates the record. Session stays active (no re-login). Section collapses back to view mode with brief success indication.

## Backend API

### New Endpoints

**`PUT /api/auth/profile`**

- Request: `{ name: string, email: string, currentPassword?: string }`
- `currentPassword` required only when email differs from the user's current email
- Returns: `AuthResponse { userId, email, name }`
- Errors: 400 (validation), 409 (duplicate email), 401 (wrong password)

**`PUT /api/auth/password`**

- Request: `{ currentPassword: string, newPassword: string }`
- Returns: 200 OK
- Errors: 400 (validation), 401 (wrong current password)

### New AuthService Methods

- `UpdateProfile(userId, request)` — validates constraints, checks email uniqueness if changed, verifies password if email changed, updates user record, re-signs cookie with updated claims
- `ChangePassword(userId, request)` — verifies current password, validates new password rules, hashes and updates

### Server-Side Validation

- Name: required, max 64 chars
- Email: required, valid format, max 254 chars, unique
- New password: min 8 chars, max 128 chars, one uppercase, one number

## Database Changes

New migration adding `HasMaxLength` constraints to the User entity:

- `User.Name` → `HasMaxLength(64)`
- `User.Email` → `HasMaxLength(254)`
- `User.PasswordHash` → `HasMaxLength(128)`

## Frontend Changes

### Settings Page

- Refactored from simple logout button to grouped-list layout
- State: `editingSection: 'none' | 'profile' | 'password'` — switching to one resets the other

### New Components

- `ProfileSection` — view/edit toggle, form state, conditional password field
- `SecuritySection` — view/change toggle, password change form with live requirements

### New Mutations

- `useUpdateProfileMutation` → `PUT /api/auth/profile`
- `useChangePasswordMutation` → `PUT /api/auth/password`

### State Updates on Success

- Profile save: `useAuth().setAuth()` with updated name/email → refreshes Jotai atom + localStorage + PageHeader
- Password save: no state change, collapse to view mode

### Error Handling

- Duplicate email → inline error on email field ("This email is already taken")
- Wrong current password → inline error on password field ("Incorrect password")
- Validation errors → same inline pattern as registration page

## Retroactive Fixes

Add `maxLength` attributes to registration page inputs to match new DB constraints:

- Name input: `maxLength={64}`
- Email input: `maxLength={254}`
- Password input: `maxLength={128}`
- Confirm password input: `maxLength={128}`

Add the same `maxLength` attributes to the login page email and password inputs.
