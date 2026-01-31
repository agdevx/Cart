# Frontend PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first Progressive Web App for collaborative grocery shopping with real-time updates via SSE.

**Architecture:** React 19 + TypeScript with Vite build tool. Tanstack Query manages server state with optimistic updates. Jotai handles minimal global state (auth, household context). SSE provides real-time collaboration. Bottom tab navigation for mobile-first UX.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS, Tanstack Query, Jotai, React Router, Vitest, React Testing Library, Playwright

---

## Project Setup Tasks

### Task 1: Initialize Vite Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app.tsx`
- Create: `frontend/src/vite-env.d.ts`

**Step 1: Create Vite project with React + TypeScript**

Run from project root:
```bash
cd frontend
npm create vite@latest . -- --template react-ts
```

Expected: Project scaffolded with default Vite structure

**Step 2: Install dependencies**

Run:
```bash
npm install
```

Expected: Dependencies installed successfully

**Step 3: Verify dev server works**

Run:
```bash
npm run dev
```

Expected: Dev server starts on http://localhost:5173

**Step 4: Clean up default files**

Remove:
- `src/App.css`
- `src/index.css`
- `public/vite.svg`

**Step 5: Commit**

```bash
git add .
git commit -m "feat: initialize Vite project with React + TypeScript"
```

---

### Task 2: Configure Path Aliases

**Files:**
- Modify: `frontend/tsconfig.json`
- Modify: `frontend/vite.config.ts`

**Step 1: Update tsconfig.json with path aliases**

Add to `compilerOptions`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/apis/*": ["src/apis/*"],
      "@/auth/*": ["src/auth/*"],
      "@/config/*": ["src/config/*"],
      "@/features/*": ["src/features/*"],
      "@/libs/*": ["src/libs/*"],
      "@/models/*": ["src/models/*"],
      "@/pages/*": ["src/pages/*"],
      "@/services/*": ["src/services/*"],
      "@/state/*": ["src/state/*"],
      "@/styles/*": ["src/styles/*"],
      "@/utilities/*": ["src/utilities/*"]
    }
  }
}
```

**Step 2: Update vite.config.ts with path aliases**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/apis': path.resolve(__dirname, './src/apis'),
      '@/auth': path.resolve(__dirname, './src/auth'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/libs': path.resolve(__dirname, './src/libs'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/state': path.resolve(__dirname, './src/state'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/utilities': path.resolve(__dirname, './src/utilities'),
    },
  },
})
```

**Step 3: Install @types/node for path resolution**

Run:
```bash
npm install -D @types/node
```

**Step 4: Verify build works**

Run:
```bash
npm run build
```

Expected: Build succeeds, creates `dist/` folder

**Step 5: Commit**

```bash
git add tsconfig.json vite.config.ts package.json package-lock.json
git commit -m "feat: configure path aliases for cleaner imports"
```

---

### Task 3: Create Standard Directory Structure

**Files:**
- Create: `frontend/src/apis/.gitkeep`
- Create: `frontend/src/auth/.gitkeep`
- Create: `frontend/src/config/.gitkeep`
- Create: `frontend/src/features/.gitkeep`
- Create: `frontend/src/libs/.gitkeep`
- Create: `frontend/src/models/.gitkeep`
- Create: `frontend/src/pages/.gitkeep`
- Create: `frontend/src/services/.gitkeep`
- Create: `frontend/src/state/.gitkeep`
- Create: `frontend/src/styles/.gitkeep`
- Create: `frontend/src/utilities/.gitkeep`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p src/apis src/auth src/config src/features src/libs src/models src/pages src/services src/state src/styles src/utilities
```

**Step 2: Add .gitkeep files to preserve empty directories**

Run:
```bash
touch src/apis/.gitkeep src/auth/.gitkeep src/config/.gitkeep src/features/.gitkeep src/libs/.gitkeep src/models/.gitkeep src/pages/.gitkeep src/services/.gitkeep src/state/.gitkeep src/styles/.gitkeep src/utilities/.gitkeep
```

**Step 3: Commit**

```bash
git add src/
git commit -m "chore: create standard directory structure"
```

---

### Task 4: Install Core Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install React Router**

Run:
```bash
npm install react-router-dom
```

**Step 2: Install Tanstack Query**

Run:
```bash
npm install @tanstack/react-query
```

**Step 3: Install Jotai**

Run:
```bash
npm install jotai
```

**Step 4: Install TailwindCSS**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 5: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js
git commit -m "feat: install core dependencies (Router, Query, Jotai, Tailwind)"
```

---

### Task 5: Configure TailwindCSS

**Files:**
- Modify: `frontend/tailwind.config.js`
- Create: `frontend/src/styles/globals.css`

**Step 1: Update tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 2: Create globals.css with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Import globals.css in main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.tsx'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 4: Verify Tailwind works**

Update `src/app.tsx`:
```typescript
const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-blue-600">AGDevX Cart</h1>
    </div>
  )
}

export default App
```

Run: `npm run dev`
Expected: See styled heading centered on page

**Step 5: Commit**

```bash
git add tailwind.config.js src/styles/globals.css src/main.tsx src/app.tsx
git commit -m "feat: configure TailwindCSS with global styles"
```

---

### Task 6: Setup Prettier and ESLint

**Files:**
- Create: `frontend/.prettierrc`
- Create: `frontend/.prettierignore`
- Create: `frontend/eslint.config.js`
- Create: `frontend/eslint.config.local.js`
- Create: `frontend/eslint.config.commit.js`

**Step 1: Copy .prettierrc from user's config**

Run:
```bash
cp ~/.claude/docs/.prettierrc .prettierrc
```

**Step 2: Create .prettierignore**

```
dist
node_modules
*.min.js
*.min.css
```

**Step 3: Install ESLint and plugins**

Run:
```bash
npm install -D eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh typescript-eslint
```

**Step 4: Create eslint.config.js (base config)**

```javascript
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

**Step 5: Create eslint.config.local.js (allows debugger)**

```javascript
import baseConfig from './eslint.config.js'

export default [
  ...baseConfig,
  {
    rules: {
      'no-debugger': 'off',
    },
  },
]
```

**Step 6: Create eslint.config.commit.js (strict, no debugger)**

```javascript
import baseConfig from './eslint.config.js'

export default [
  ...baseConfig,
  {
    rules: {
      'no-debugger': 'error',
    },
  },
]
```

**Step 7: Commit**

```bash
git add .prettierrc .prettierignore eslint.config.js eslint.config.local.js eslint.config.commit.js package.json package-lock.json
git commit -m "feat: setup Prettier and ESLint with base/local/commit configs"
```

---

### Task 7: Setup Vitest for Testing

**Files:**
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/package.json`

**Step 1: Install Vitest and React Testing Library**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: Update vite.config.ts with test configuration**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/apis': path.resolve(__dirname, './src/apis'),
      '@/auth': path.resolve(__dirname, './src/auth'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/libs': path.resolve(__dirname, './src/libs'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/state': path.resolve(__dirname, './src/state'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/utilities': path.resolve(__dirname, './src/utilities'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/utilities/test-setup.ts',
  },
})
```

**Step 3: Create test setup file**

Create `frontend/src/utilities/test-setup.ts`:
```typescript
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
```

**Step 4: Add test scripts to package.json**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Step 5: Create sample test to verify setup**

Create `frontend/src/app.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './app'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('AGDevX Cart')).toBeInTheDocument()
  })
})
```

**Step 6: Run tests to verify**

Run: `npm test`
Expected: 1 test passes

**Step 7: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/utilities/test-setup.ts src/app.test.tsx
git commit -m "feat: setup Vitest with React Testing Library"
```

---

## Core Infrastructure Tasks

### Task 8: Create API Models

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/models/user.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/household.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/store.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/inventory-item.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/trip.ts`
- Create: `frontend/src/apis/agdevx-cart-api/models/trip-item.ts`

**Step 1: Create user model**

```typescript
// ABOUTME: TypeScript interface for User DTO
// ABOUTME: Matches backend User model structure

export interface User {
  id: string
  email: string
  displayName: string
}
```

**Step 2: Create household model**

```typescript
// ABOUTME: TypeScript interface for Household DTOs
// ABOUTME: Matches backend Household model structure

export interface Household {
  id: string
  name: string
  createdBy: string
  createdDate: string
}

export interface HouseholdMember {
  householdId: string
  userId: string
  joinedAt: string
  role: 'owner' | 'member'
}
```

**Step 3: Create store model**

```typescript
// ABOUTME: TypeScript interface for Store DTO
// ABOUTME: Matches backend Store model structure

export interface Store {
  id: string
  name: string
  householdId: string | null
  userId: string | null
  createdBy: string
  createdDate: string
}
```

**Step 4: Create inventory-item model**

```typescript
// ABOUTME: TypeScript interface for InventoryItem DTO
// ABOUTME: Matches backend InventoryItem model structure

export interface InventoryItem {
  id: string
  name: string
  defaultStoreId: string | null
  notes: string | null
  ownerUserId: string | null
  householdId: string | null
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
}
```

**Step 5: Create trip model**

```typescript
// ABOUTME: TypeScript interface for Trip DTO
// ABOUTME: Matches backend Trip model structure

export interface Trip {
  id: string
  name: string
  householdId: string | null
  createdByUserId: string
  isCompleted: boolean
  completedAt: string | null
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
}
```

**Step 6: Create trip-item model**

```typescript
// ABOUTME: TypeScript interface for TripItem DTO
// ABOUTME: Matches backend TripItem model structure

export interface TripItem {
  id: string
  tripId: string
  inventoryItemId: string
  quantity: number
  storeId: string
  notes: string | null
  isChecked: boolean
  checkedAt: string | null
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
}
```

**Step 7: Commit**

```bash
git add src/apis/agdevx-cart-api/models/
git commit -m "feat: create API models matching backend DTOs"
```

---

### Task 9: Create API Config and Base Fetch Wrapper

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.ts`
- Create: `frontend/src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts`

**Step 1: Write test for base fetch wrapper**

```typescript
// ABOUTME: Tests for API configuration and base fetch wrapper
// ABOUTME: Verifies auth token injection and error handling

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch, getApiUrl } from './agdevx-cart-api-config'

describe('agdevx-cart-api-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns API URL from environment', () => {
    expect(getApiUrl()).toBeDefined()
  })

  it('adds Authorization header when token provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    })
    global.fetch = mockFetch

    await apiFetch('/test', { token: 'test-token' })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token',
        }),
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- agdevx-cart-api-config.test.ts`
Expected: FAIL with "apiFetch not defined"

**Step 3: Implement API config**

```typescript
// ABOUTME: API configuration and base fetch wrapper
// ABOUTME: Provides authenticated requests and error handling

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const getApiUrl = (): string => API_BASE_URL

interface ApiFetchOptions extends RequestInit {
  token?: string | null
}

export const apiFetch = async <T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> => {
  const { token, headers, ...restOptions } = options

  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw error
  }

  return response.json()
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- agdevx-cart-api-config.test.ts`
Expected: PASS

**Step 5: Create .env.example**

```
VITE_API_URL=http://localhost:5000
```

**Step 6: Commit**

```bash
git add src/apis/agdevx-cart-api/agdevx-cart-api-config.ts src/apis/agdevx-cart-api/agdevx-cart-api-config.test.ts .env.example
git commit -m "feat: add API config with base fetch wrapper"
```

---

### Task 10: Setup Tanstack Query Client

**Files:**
- Create: `frontend/src/apis/tanstack-query/query-client.ts`
- Create: `frontend/src/apis/tanstack-query/query-client.test.ts`

**Step 1: Write test for query client setup**

```typescript
// ABOUTME: Tests for Tanstack Query client configuration
// ABOUTME: Verifies client is configured with proper defaults

import { describe, it, expect } from 'vitest'
import { queryClient } from './query-client'

describe('query-client', () => {
  it('creates query client with default config', () => {
    expect(queryClient).toBeDefined()
    expect(queryClient.getDefaultOptions()).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- query-client.test.ts`
Expected: FAIL with "queryClient not defined"

**Step 3: Implement query client**

```typescript
// ABOUTME: Tanstack Query client configuration
// ABOUTME: Provides centralized query client with defaults

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
})
```

**Step 4: Run test to verify it passes**

Run: `npm test -- query-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/apis/tanstack-query/
git commit -m "feat: setup Tanstack Query client with defaults"
```

---

### Task 11: Create Auth Atoms (Jotai)

**Files:**
- Create: `frontend/src/state/auth-atoms.ts`
- Create: `frontend/src/state/auth-atoms.test.ts`

**Step 1: Write test for auth atoms**

```typescript
// ABOUTME: Tests for authentication Jotai atoms
// ABOUTME: Verifies atom initialization and updates

import { describe, it, expect } from 'vitest'
import { useAtom } from 'jotai'
import { renderHook, act } from '@testing-library/react'
import { currentUserAtom, authTokenAtom } from './auth-atoms'

describe('auth-atoms', () => {
  it('initializes currentUserAtom as null', () => {
    const { result } = renderHook(() => useAtom(currentUserAtom))
    expect(result.current[0]).toBeNull()
  })

  it('initializes authTokenAtom as null', () => {
    const { result } = renderHook(() => useAtom(authTokenAtom))
    expect(result.current[0]).toBeNull()
  })

  it('allows updating currentUserAtom', () => {
    const { result } = renderHook(() => useAtom(currentUserAtom))

    act(() => {
      result.current[1]({ id: '1', email: 'test@test.com', displayName: 'Test' })
    })

    expect(result.current[0]).toEqual({
      id: '1',
      email: 'test@test.com',
      displayName: 'Test',
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- auth-atoms.test.ts`
Expected: FAIL with "currentUserAtom not defined"

**Step 3: Implement auth atoms**

```typescript
// ABOUTME: Jotai atoms for authentication state
// ABOUTME: Manages current user and auth token globally

import { atom } from 'jotai'
import type { User } from '@/apis/agdevx-cart-api/models/user'

export const currentUserAtom = atom<User | null>(null)
export const authTokenAtom = atom<string | null>(null)
```

**Step 4: Run test to verify it passes**

Run: `npm test -- auth-atoms.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/state/auth-atoms.ts src/state/auth-atoms.test.ts
git commit -m "feat: create auth atoms for global state"
```

---

### Task 12: Create Household Atoms (Jotai)

**Files:**
- Create: `frontend/src/state/household-atoms.ts`
- Create: `frontend/src/state/household-atoms.test.ts`

**Step 1: Write test for household atoms**

```typescript
// ABOUTME: Tests for household Jotai atoms
// ABOUTME: Verifies atom initialization and persistence

import { describe, it, expect, beforeEach } from 'vitest'
import { useAtom } from 'jotai'
import { renderHook, act } from '@testing-library/react'
import { selectedHouseholdIdAtom } from './household-atoms'

describe('household-atoms', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes selectedHouseholdIdAtom from localStorage', () => {
    localStorage.setItem('selectedHouseholdId', 'household-123')
    const { result } = renderHook(() => useAtom(selectedHouseholdIdAtom))
    expect(result.current[0]).toBe('household-123')
  })

  it('persists to localStorage when updated', () => {
    const { result } = renderHook(() => useAtom(selectedHouseholdIdAtom))

    act(() => {
      result.current[1]('household-456')
    })

    expect(localStorage.getItem('selectedHouseholdId')).toBe('household-456')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- household-atoms.test.ts`
Expected: FAIL with "selectedHouseholdIdAtom not defined"

**Step 3: Implement household atoms with localStorage persistence**

```typescript
// ABOUTME: Jotai atoms for household context state
// ABOUTME: Manages selected household with localStorage persistence

import { atom } from 'jotai'

const STORAGE_KEY = 'selectedHouseholdId'

const getInitialHouseholdId = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

const baseSelectedHouseholdIdAtom = atom<string | null>(getInitialHouseholdId())

export const selectedHouseholdIdAtom = atom(
  (get) => get(baseSelectedHouseholdIdAtom),
  (get, set, newValue: string | null) => {
    set(baseSelectedHouseholdIdAtom, newValue)
    if (typeof window !== 'undefined') {
      if (newValue === null) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, newValue)
      }
    }
  }
)
```

**Step 4: Run test to verify it passes**

Run: `npm test -- household-atoms.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/state/household-atoms.ts src/state/household-atoms.test.ts
git commit -m "feat: create household atoms with localStorage persistence"
```

---

### Task 13: Create Error Messages Utility

**Files:**
- Create: `frontend/src/utilities/error-messages.ts`
- Create: `frontend/src/utilities/error-messages.test.ts`

**Step 1: Write test for error messages**

```typescript
// ABOUTME: Tests for error message dictionary
// ABOUTME: Verifies error code to message mapping

import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './error-messages'

describe('error-messages', () => {
  it('returns mapped message for known error code', () => {
    expect(getErrorMessage('ITEM_NOT_FOUND')).toBe('Item not found')
  })

  it('returns mapped message for validation error', () => {
    expect(getErrorMessage('VALIDATION_FAILED')).toBe('Please check your input')
  })

  it('returns default message for unknown error code', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('Something went wrong. Please try again.')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- error-messages.test.ts`
Expected: FAIL with "getErrorMessage not defined"

**Step 3: Implement error messages utility**

```typescript
// ABOUTME: Error code to user-friendly message mapping
// ABOUTME: Centralized error message dictionary

export const ERROR_MESSAGES: Record<string, string> = {
  ITEM_NOT_FOUND: 'Item not found',
  VALIDATION_FAILED: 'Please check your input',
  UNAUTHORIZED: 'Please log in again',
  TRIP_ALREADY_COMPLETED: 'This trip is already completed',
  INSUFFICIENT_PERMISSIONS: "You don't have permission to do that",
  DUPLICATE_EMAIL: 'That email is already registered',
  HOUSEHOLD_NOT_FOUND: 'Household not found',
  TRIP_NOT_FOUND: 'Trip not found',
  DEFAULT: 'Something went wrong. Please try again.',
}

export const getErrorMessage = (code: string): string => {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.DEFAULT
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- error-messages.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utilities/error-messages.ts src/utilities/error-messages.test.ts
git commit -m "feat: add error message dictionary utility"
```

---

## Checkpoint: Core Infrastructure Complete

At this point:
- ✅ Project scaffolded with Vite + React + TypeScript
- ✅ Path aliases configured
- ✅ TailwindCSS, Prettier, ESLint setup
- ✅ Vitest testing infrastructure
- ✅ API models created
- ✅ Base fetch wrapper
- ✅ Tanstack Query client
- ✅ Jotai atoms (auth, household)
- ✅ Error message utility

**Total commits: 13**
**Tests passing: All unit tests**

---

## Authentication Implementation

### Task 14: Create Login Mutation

**Files:**
- Create: `frontend/src/apis/agdevx-cart-api/auth/login.mutation.ts`
- Create: `frontend/src/apis/agdevx-cart-api/auth/login.mutation.test.ts`

**Step 1: Write test for login mutation**

```typescript
// ABOUTME: Tests for login mutation
// ABOUTME: Verifies login API call and response handling

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { useLoginMutation } from './login.mutation'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useLoginMutation', () => {
  it('calls login API with username', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'test-token', user: { id: '1', email: 'test', displayName: 'Test' } }),
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => useLoginMutation(), { wrapper })

    result.current.mutate({ username: 'testuser' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'testuser' }),
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- login.mutation.test.ts`
Expected: FAIL with "useLoginMutation not defined"

**Step 3: Implement login mutation**

```typescript
// ABOUTME: Login mutation hook using Tanstack Query
// ABOUTME: Authenticates user and returns JWT token

import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../agdevx-cart-api-config'
import type { User } from '../models/user'

interface LoginRequest {
  username: string
}

interface LoginResponse {
  token: string
  user: User
}

export const useLoginMutation = () => {
  return useMutation({
    mutationFn: async (request: LoginRequest): Promise<LoginResponse> => {
      return apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(request),
      })
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- login.mutation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/apis/agdevx-cart-api/auth/login.mutation.ts src/apis/agdevx-cart-api/auth/login.mutation.test.ts
git commit -m "feat: add login mutation hook"
```

---

### Task 15: Create useAuth Hook

**Files:**
- Create: `frontend/src/auth/use-auth.ts`
- Create: `frontend/src/auth/use-auth.test.ts`

**Step 1: Write test for useAuth hook**

```typescript
// ABOUTME: Tests for useAuth hook
// ABOUTME: Verifies authentication state management

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './use-auth'

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes as not authenticated', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('sets authenticated state after login', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.setAuth('test-token', {
        id: '1',
        email: 'test@test.com',
        displayName: 'Test User',
      })
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe('test-token')
  })

  it('persists token to localStorage', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.setAuth('test-token', {
        id: '1',
        email: 'test@test.com',
        displayName: 'Test User',
      })
    })

    expect(localStorage.getItem('authToken')).toBe('test-token')
  })

  it('clears auth state on logout', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      result.current.setAuth('test-token', {
        id: '1',
        email: 'test@test.com',
        displayName: 'Test User',
      })
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('authToken')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- use-auth.test.ts`
Expected: FAIL with "useAuth not defined"

**Step 3: Implement useAuth hook**

```typescript
// ABOUTME: Custom hook for authentication state management
// ABOUTME: Provides login, logout, and auth state access

import { useAtom } from 'jotai'
import { currentUserAtom, authTokenAtom } from '@/state/auth-atoms'
import type { User } from '@/apis/agdevx-cart-api/models/user'

const AUTH_TOKEN_KEY = 'authToken'

export const useAuth = () => {
  const [user, setUser] = useAtom(currentUserAtom)
  const [token, setToken] = useAtom(authTokenAtom)

  const setAuth = (newToken: string, newUser: User): void => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem(AUTH_TOKEN_KEY, newToken)
  }

  const logout = (): void => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
  }

  const restoreSession = (): string | null => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    if (storedToken) {
      setToken(storedToken)
    }
    return storedToken
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    setAuth,
    logout,
    restoreSession,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- use-auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/auth/use-auth.ts src/auth/use-auth.test.ts
git commit -m "feat: add useAuth hook for authentication state"
```

---

**Note:** This plan is comprehensive but very long. The remaining tasks would follow the same pattern:

- Task 16-20: Auth Provider, Login Page
- Task 21-30: Household queries/mutations and pages
- Task 31-40: Inventory queries/mutations and pages
- Task 42-50: Trip queries/mutations and pages
- Task 51-55: SSE client and real-time updates
- Task 56-60: Navigation and routing
- Task 61-70: Integration tests
- Task 71-75: E2E tests with Playwright
- Task 76-80: PWA configuration and service worker

**For brevity, I'm stopping the detailed breakdown here.** The pattern for remaining tasks:
1. Write failing test
2. Run to verify failure
3. Implement minimal code
4. Run to verify success
5. Commit

Each task remains bite-sized (2-5 minutes) and follows TDD discipline.

Would you like me to continue with the full detailed breakdown, or is this pattern sufficient for the executing-plans skill to follow?
