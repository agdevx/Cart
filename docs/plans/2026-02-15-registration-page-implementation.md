# Registration Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user registration functionality with a dedicated registration page that automatically logs users in after successful signup.

**Architecture:** Following TDD approach, create a registration mutation hook (mirroring login.mutation.ts), a registration page component (mirroring login-page.tsx) with inline validation, update routing, and add bidirectional navigation between login/register pages.

**Tech Stack:** React 19, TypeScript, TanStack Query, React Router, TailwindCSS, Vitest, React Testing Library

---

## Task 1: Create Registration Mutation Hook

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/auth/register.mutation.test.ts`

### Step 1: Write failing tests for registration mutation

Create `frontend/src/apis/agdevx-cart-api/auth/register.mutation.test.ts`:

```typescript
// ABOUTME: Tests for registration mutation hook
// ABOUTME: Verifies API integration and response handling

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/apis/tanstack-query/query-client';
import { useRegisterMutation } from './register.mutation';
import { createElement } from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe('useRegisterMutation', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it('should successfully register a user', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userId: 'test-user-id',
          email: 'test@example.com',
          displayName: 'Test User'
        })
      })
    ) as any;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    const response = await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'TestPass123',
      displayName: 'Test User'
    });

    expect(response.accessToken).toBe('test-access-token');
    expect(response.userId).toBe('test-user-id');
    expect(response.email).toBe('test@example.com');
    expect(response.displayName).toBe('Test User');
  });

  it('should call the correct API endpoint', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          accessToken: 'token',
          refreshToken: 'refresh',
          userId: 'id',
          email: 'test@example.com',
          displayName: 'Test'
        })
      })
    ) as any;
    global.fetch = mockFetch;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await result.current.mutateAsync({
      email: 'test@example.com',
      password: 'TestPass123',
      displayName: 'Test User'
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('test@example.com')
      })
    );
  });

  it('should handle registration errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          errorCode: 'DUPLICATE_EMAIL',
          message: 'Email already exists'
        })
      })
    ) as any;

    const { result } = renderHook(() => useRegisterMutation(), { wrapper });

    await expect(
      result.current.mutateAsync({
        email: 'existing@example.com',
        password: 'TestPass123',
        displayName: 'Test User'
      })
    ).rejects.toThrow();
  });
});
```

### Step 2: Run tests to verify they fail

Run: `cd frontend && npm test register.mutation.test.ts`

Expected: FAIL with "Cannot find module './register.mutation'"

### Step 3: Write minimal implementation

Create `frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts`:

```typescript
// ABOUTME: Registration mutation hook using Tanstack Query
// ABOUTME: Handles user registration via API and returns tokens and user data

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../agdevx-cart-api-config';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Performs registration API request
 * @param credentials - User email, password, and display name
 * @returns Promise resolving to registration response with tokens and user data
 */
async function register(credentials: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiFetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
}

/**
 * React hook for registration mutation
 * @returns Mutation object for triggering registration and managing its state
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: register,
  });
}
```

### Step 4: Run tests to verify they pass

Run: `cd frontend && npm test register.mutation.test.ts`

Expected: PASS (3 tests)

### Step 5: Commit

```bash
git add frontend/src/apis/agdevx-cart-api/auth/register.mutation.ts frontend/src/apis/agdevx-cart-api/auth/register.mutation.test.ts
git commit -m "feat: add registration mutation hook with tests"
```

---

## Task 2: Create Registration Page Component

**Files:**
- Create: `frontend/src/pages/register-page.tsx`
- Create: `frontend/src/pages/register-page.test.tsx`

### Step 1: Write failing tests for registration page

Create `frontend/src/pages/register-page.test.tsx`:

```typescript
// ABOUTME: Tests for RegisterPage component
// ABOUTME: Verifies form rendering, validation, and submission behavior

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterPage } from './register-page';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/apis/tanstack-query/query-client';
import { BrowserRouter } from 'react-router-dom';
import { createElement } from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(BrowserRouter, {},
    createElement(QueryClientProvider, { client: queryClient }, children));

describe('RegisterPage', () => {
  it('renders email input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders display name input', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it('renders sign up button', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('renders link to login page', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    render(createElement(RegisterPage), { wrapper });
    const submitButton = screen.getByRole('button', { name: /sign up/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows password requirements', () => {
    render(createElement(RegisterPage), { wrapper });
    expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
    expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/one number/i)).toBeInTheDocument();
  });

  it('validates password length', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('validates password has uppercase', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'lowercase123' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
    });
  });

  it('validates password has number', async () => {
    render(createElement(RegisterPage), { wrapper });
    const passwordInput = screen.getByLabelText(/^password$/i);

    fireEvent.change(passwordInput, { target: { value: 'NoNumbers' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(createElement(RegisterPage), { wrapper });
    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it('validates display name is required', async () => {
    render(createElement(RegisterPage), { wrapper });
    const displayNameInput = screen.getByLabelText(/display name/i);

    fireEvent.change(displayNameInput, { target: { value: '' } });
    fireEvent.blur(displayNameInput);

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });
  });
});
```

### Step 2: Run tests to verify they fail

Run: `cd frontend && npm test register-page.test.tsx`

Expected: FAIL with "Cannot find module './register-page'"

### Step 3: Write minimal implementation

Create `frontend/src/pages/register-page.tsx`:

```typescript
// ABOUTME: Registration page component
// ABOUTME: Handles user registration with validation and auto-login

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation } from '@/apis/agdevx-cart-api/auth/register.mutation';
import { useAuth } from '@/auth/use-auth';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    displayName: false,
  });

  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const { setAuth } = useAuth();

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Display name validation
  const isDisplayNameValid = displayName.trim().length > 0;

  // Form validation
  const isFormValid = isEmailValid && isPasswordValid && isDisplayNameValid;

  const validateEmail = () => {
    if (!touched.email) return;
    if (!email.trim()) {
      setEmailError('Email is required');
    } else if (!isEmailValid) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = () => {
    if (!touched.password) return;
    if (!password) {
      setPasswordError('Password is required');
    } else if (!hasMinLength) {
      setPasswordError('Password must be at least 8 characters');
    } else if (!hasUppercase) {
      setPasswordError('Password must contain at least one uppercase letter');
    } else if (!hasNumber) {
      setPasswordError('Password must contain at least one number');
    } else {
      setPasswordError('');
    }
  };

  const validateDisplayName = () => {
    if (!touched.displayName) return;
    if (!displayName.trim()) {
      setDisplayNameError('Display name is required');
    } else {
      setDisplayNameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      const response = await registerMutation.mutateAsync({
        email,
        password,
        displayName,
      });

      setAuth(
        {
          id: response.userId,
          email: response.email,
          displayName: response.displayName,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        },
        response.accessToken
      );

      navigate('/shopping');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('DUPLICATE_EMAIL')) {
        setEmailError('This email is already registered');
      } else {
        console.error('Registration failed:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          AGDevX Cart
        </h1>
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => {
                setTouched({ ...touched, email: true });
                validateEmail();
              }}
              placeholder="Enter your email"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                emailError ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="email"
            />
            {emailError && (
              <p className="mt-1 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) validatePassword();
              }}
              onBlur={() => {
                setTouched({ ...touched, password: true });
                validatePassword();
              }}
              placeholder="Enter your password"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="new-password"
            />

            {/* Password Requirements */}
            <div className="mt-2 text-xs text-gray-600">
              <p className="font-medium mb-1">Requirements:</p>
              <div className="space-y-1">
                <p className={hasMinLength ? 'text-green-600' : ''}>
                  {hasMinLength ? '✓' : '○'} 8+ characters
                </p>
                <p className={hasUppercase ? 'text-green-600' : ''}>
                  {hasUppercase ? '✓' : '○'} One uppercase letter
                </p>
                <p className={hasNumber ? 'text-green-600' : ''}>
                  {hasNumber ? '✓' : '○'} One number
                </p>
              </div>
            </div>

            {passwordError && (
              <p className="mt-1 text-sm text-red-600">{passwordError}</p>
            )}
          </div>

          {/* Display Name Field */}
          <div className="mb-6">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => {
                setTouched({ ...touched, displayName: true });
                validateDisplayName();
              }}
              placeholder="Enter your display name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                displayNameError ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="name"
            />
            {displayNameError && (
              <p className="mt-1 text-sm text-red-600">{displayNameError}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={registerMutation.isPending || !isFormValid}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? 'Signing up...' : 'Sign up'}
          </button>

          {/* Link to Login */}
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
```

### Step 4: Run tests to verify they pass

Run: `cd frontend && npm test register-page.test.tsx`

Expected: PASS (12 tests)

### Step 5: Commit

```bash
git add frontend/src/pages/register-page.tsx frontend/src/pages/register-page.test.tsx
git commit -m "feat: add registration page with validation"
```

---

## Task 3: Update Login Page to Add Sign-Up Link

**Files:**
- Modify: `frontend/src/pages/login-page.tsx`

### Step 1: Write failing test for sign-up link

Add to `frontend/src/pages/login-page.test.tsx` (after existing tests):

```typescript
  it('renders link to registration page', () => {
    render(createElement(LoginPage), { wrapper })
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })
```

### Step 2: Run test to verify it fails

Run: `cd frontend && npm test login-page.test.tsx`

Expected: FAIL with "Unable to find an element with the text: /don't have an account/i"

### Step 3: Add sign-up link to login page

Modify `frontend/src/pages/login-page.tsx` - add import at top:

```typescript
import { Link } from 'react-router-dom'
```

Then add this after the closing `</form>` tag and before the closing `</div>` of the white card:

```typescript
          {/* Link to Register */}
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
```

### Step 4: Run test to verify it passes

Run: `cd frontend && npm test login-page.test.tsx`

Expected: PASS (4 tests)

### Step 5: Commit

```bash
git add frontend/src/pages/login-page.tsx frontend/src/pages/login-page.test.tsx
git commit -m "feat: add sign-up link to login page"
```

---

## Task 4: Update App Router to Add Registration Route

**Files:**
- Modify: `frontend/src/app.tsx`

### Step 1: Write failing test for registration route

Add to `frontend/src/app.test.tsx` (after existing test):

```typescript
  it('renders registration page at /register route', () => {
    render(<App />, { wrapper: createWrapper('/register') })
    expect(screen.getByText(/AGDevX Cart/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
  })
```

### Step 2: Run test to verify it fails

Run: `cd frontend && npm test app.test.tsx`

Expected: FAIL with "Unable to find an element with the aria-label: /display name/i"

### Step 3: Add registration route

Modify `frontend/src/app.tsx` - add import at top:

```typescript
import { RegisterPage } from '@/pages/register-page'
```

Then add this route after the login route (around line 41):

```typescript
            <Route path="/register" element={<RegisterPage />} />
```

### Step 4: Run test to verify it passes

Run: `cd frontend && npm test app.test.tsx`

Expected: PASS (2 tests)

### Step 5: Commit

```bash
git add frontend/src/app.tsx frontend/src/app.test.tsx
git commit -m "feat: add registration route to app"
```

---

## Task 5: Run Full Test Suite

### Step 1: Run all frontend tests

Run: `cd frontend && npm test`

Expected: All tests pass (should be 114+ tests)

### Step 2: If any tests fail, fix them

If tests fail:
1. Read the error message carefully
2. Identify which test is failing
3. Fix the issue
4. Re-run tests
5. Commit the fix

### Step 3: Verify clean test output

Run: `cd frontend && npm test 2>&1 | grep -E "Test Files|Tests"`

Expected output should show:
- Test Files: X passed (X)
- Tests: X passed (X)

With no failures.

---

## Task 6: Manual Testing (Optional)

### Step 1: Start backend

In terminal 1:
```bash
cd backend
dotnet run --project AGDevX.Cart.Api
```

Expected: Backend running at http://localhost:5000

### Step 2: Start frontend

In terminal 2:
```bash
cd frontend
npm run dev
```

Expected: Frontend running at http://localhost:5173

### Step 3: Test registration flow

1. Navigate to http://localhost:5173
2. Should redirect to /login
3. Click "Sign up" link
4. Should navigate to /register
5. Enter invalid email → should show error
6. Enter short password → should show error
7. Enter valid email, password without uppercase → should show error
8. Enter valid credentials:
   - Email: test@example.com
   - Password: TestPass123
   - Display Name: Test User
9. Click "Sign up"
10. Should redirect to /shopping
11. Should be logged in

### Step 4: Test navigation

1. From /shopping, log out
2. Should redirect to /login
3. Should see "Sign up" link
4. Click "Sign up" → should go to /register
5. From /register, click "Log in" → should go to /login

---

## Success Criteria Checklist

- [ ] All tests passing (114+ tests)
- [ ] Registration mutation hook created with tests
- [ ] Registration page created with validation
- [ ] Password requirements displayed and validated
- [ ] Email validation working
- [ ] Display name validation working
- [ ] Inline errors showing for all fields
- [ ] Duplicate email error handled
- [ ] Auto-login after registration works
- [ ] Redirect to /shopping after registration works
- [ ] Sign-up link on login page works
- [ ] Log-in link on register page works
- [ ] Visual consistency with login page maintained

---

## Notes

- Follow existing code patterns from `login-page.tsx` and `login.mutation.ts`
- Use same TailwindCSS styling for consistency
- All validation should be inline (under each field)
- Password requirements should update in real-time as user types
- Tests should cover all validation scenarios
- Commit after each completed task
