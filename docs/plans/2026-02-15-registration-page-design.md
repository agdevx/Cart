# Registration Page Design

**Date:** 2026-02-15
**Status:** Approved
**Author:** Claude + August

## Overview

Add user registration functionality to the frontend with a dedicated registration page, enabling new users to create accounts through the UI instead of using the API directly.

## Requirements

### User Experience
- Seamless registration flow with automatic login after successful registration
- Standard password security requirements (8+ chars, uppercase, number)
- Inline validation errors for immediate feedback
- Bidirectional navigation between login and registration pages

### Fields
1. **Email** (required) - valid email format
2. **Password** (required) - meets security requirements
3. **Display Name** (required) - user's display name

### Success Flow
1. User fills registration form with valid data
2. Submits form → calls `/api/auth/register`
3. Receives auth tokens and user data
4. Automatically logged in via `setAuth()`
5. Redirected to `/shopping` page

## Architecture

### New Components

**`register-page.tsx`**
- Registration form component
- Mirrors `login-page.tsx` structure and styling
- Three input fields: email, password, displayName
- Real-time inline validation
- "Already have an account? Log in" link to `/login`

**`register.mutation.ts`**
- TanStack Query mutation hook
- Calls `POST /api/auth/register`
- Request: `{ email, password, displayName }`
- Response: `AuthResponse` (same as login)

**`register.mutation.test.ts`**
- Unit tests for registration mutation
- Tests success response structure
- Tests error handling

**`register-page.test.tsx`**
- Component tests for registration page
- Tests form rendering and validation
- Tests success flow (setAuth + navigation)
- Tests error display

### Modified Components

**`login-page.tsx`**
- Add "Don't have an account? Sign up" link at bottom
- Links to `/register` route

**`app.tsx`**
- Add new public route: `/register` → `<RegisterPage />`

## Routing

```
/login         → LoginPage (public)
/register      → RegisterPage (public) ← NEW
/shopping      → ShoppingPage (protected, redirect after registration)
```

## Form Validation

### Client-Side Validation (Real-time)

**Email Field:**
- Valid email format (browser + custom validation)
- Error: "Please enter a valid email address"
- Error: "This email is already registered" (from backend)

**Password Field:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one number (0-9)
- Show requirements checklist below field with checkmarks as met
- Errors:
  - "Password must be at least 8 characters"
  - "Password must contain at least one uppercase letter"
  - "Password must contain at least one number"

**Display Name Field:**
- Non-empty string
- Error: "Display name is required"

### Submit Button State
- Disabled when:
  - Any field is invalid
  - Mutation is pending
- Text: "Sign up" (becomes "Signing up..." during submission)

## Error Handling

### Inline Errors
- Display errors directly under each field
- Error text styling: `text-red-600 text-sm mt-1`
- Invalid field border: `border-red-500`

### Backend Error Handling
```typescript
catch (error) {
  if (error.response?.data?.errorCode === 'DUPLICATE_EMAIL') {
    setEmailError('This email is already registered')
  } else {
    setGeneralError('Registration failed. Please try again.')
  }
}
```

## API Integration

### Endpoint
`POST /api/auth/register`

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "displayName": "User Name"
}
```

### Response (Success - 200 OK)
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "...",
  "userId": "guid",
  "email": "user@example.com",
  "displayName": "User Name"
}
```

### Response (Error - 400 Bad Request)
```json
{
  "errorCode": "DUPLICATE_EMAIL",
  "message": "Email already exists"
}
```

## State Management

- Uses existing `AuthProvider` context (no changes needed)
- Registration mutation managed by TanStack Query
- Form state managed locally with React `useState`
- On success: calls `setAuth(user, accessToken)` then navigates

## Testing Strategy

### Unit Tests (`register.mutation.test.ts`)
- ✓ Successful registration returns correct response structure
- ✓ API call uses correct endpoint (`/api/auth/register`)
- ✓ Request includes all required fields
- ✓ Error handling for failed requests

### Component Tests (`register-page.test.tsx`)
- ✓ Renders email input field
- ✓ Renders password input field
- ✓ Renders display name input field
- ✓ Renders "Sign up" button
- ✓ Renders "Already have an account? Log in" link
- ✓ Submit button disabled when fields invalid
- ✓ Shows inline validation errors for email
- ✓ Shows inline validation errors for password
- ✓ Shows inline validation errors for display name
- ✓ Password requirements checklist updates as user types
- ✓ Successful registration calls setAuth
- ✓ Successful registration navigates to /shopping
- ✓ Displays backend error for duplicate email

### Test Pattern
- Follow existing `login-page.test.tsx` pattern
- Use Vitest + React Testing Library
- Mock TanStack Query mutations
- Mock `useAuth` and `useNavigate` hooks

## Visual Design

### Styling Consistency
- Match `login-page.tsx` exactly for consistency
- Same TailwindCSS classes and layout
- Same card styling with white background and shadow
- Same input field styling

### Layout
```
┌─────────────────────────────────┐
│  AGDevX Cart                    │
│                                 │
│  Email                          │
│  [input field]                  │
│  [inline error if any]          │
│                                 │
│  Password                       │
│  [input field]                  │
│  Requirements:                  │
│  ☐/☑ 8+ characters              │
│  ☐/☑ One uppercase letter       │
│  ☐/☑ One number                 │
│  [inline error if any]          │
│                                 │
│  Display Name                   │
│  [input field]                  │
│  [inline error if any]          │
│                                 │
│  [Sign up Button]               │
│                                 │
│  Already have an account?       │
│  Log in                         │
└─────────────────────────────────┘
```

## Implementation Checklist

- [ ] Create `register.mutation.ts` with API integration
- [ ] Create `register.mutation.test.ts` with unit tests
- [ ] Create `register-page.tsx` component
- [ ] Add password validation logic and requirements checklist
- [ ] Add inline error display for all fields
- [ ] Create `register-page.test.tsx` with component tests
- [ ] Update `login-page.tsx` to add "Sign up" link
- [ ] Update `app.tsx` to add `/register` route
- [ ] Run all tests to ensure passing
- [ ] Manual testing of registration flow

## Success Criteria

- ✓ User can navigate from login to registration page
- ✓ User can fill registration form with validation feedback
- ✓ Password requirements are clearly displayed and validated
- ✓ Inline errors show for invalid fields
- ✓ Duplicate email error handled gracefully
- ✓ Successful registration auto-logs user in
- ✓ User redirected to /shopping after registration
- ✓ All unit tests passing
- ✓ All component tests passing
- ✓ Visual consistency with login page maintained
