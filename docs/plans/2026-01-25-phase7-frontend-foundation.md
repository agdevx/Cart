# Phase 7: Frontend Foundation Implementation Plan

> **Status:** SUPERSEDED. This plan was replaced by `2026-01-31-frontend-pwa-implementation.md` which combined phases 7+8 into a unified PWA implementation. JWT auth was later migrated to cookie-based (see `2026-02-22-cookie-auth-migration-plan.md`).

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete React 19 frontend foundation with routing, styling, state management, and authentication.

**Architecture:** Vite + React 19 + TypeScript frontend with TailwindCSS for styling, React Router v7 for routing, TanStack Query for server state, Jotai for client state, and JWT authentication with localStorage persistence.

**Tech Stack:** React 19, TypeScript, Vite, TailwindCSS, React Router v7, TanStack Query, Jotai, fetch API

---

## Task 26: React Project Setup

**Files:**
- Create: `frontend/` directory
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/index.html`
- Modify: `.gitignore`

**Step 1: Create frontend directory**

Run:
```bash
mkdir frontend
cd frontend
```

Expected: Directory created

**Step 2: Initialize Vite project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

Expected: Vite project scaffolded with React 19 and TypeScript

**Step 3: Install dependencies**

Run:
```bash
npm install
```

Expected: All dependencies installed

**Step 4: Configure Vite proxy**

Modify `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

**Step 5: Setup folder structure**

Run:
```bash
mkdir -p src/components src/hooks src/services src/types src/pages src/lib
```

Expected: All directories created

**Step 6: Update .gitignore**

Add to `.gitignore`:
```
# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env
frontend/.env.local
```

**Step 7: Verify dev server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:3000

Stop server (Ctrl+C)

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: initialize React 19 frontend with Vite and TypeScript"
```

Expected: Commit created

---

## Task 27: TailwindCSS Configuration

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Install TailwindCSS**

Run:
```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
```

Expected: Packages installed

**Step 2: Initialize Tailwind**

Run:
```bash
npx tailwindcss init -p
```

Expected: Config files created

**Step 3: Configure Tailwind**

Modify `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
}
```

**Step 4: Create base CSS**

Create `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors;
  }

  .btn-secondary {
    @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors;
  }

  .card {
    @apply bg-white rounded-lg shadow-md p-6;
  }

  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }

  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
}
```

**Step 5: Import CSS**

Modify `frontend/src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 6: Test Tailwind**

Modify `frontend/src/App.tsx`:
```typescript
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card">
        <h1 className="text-3xl font-bold text-primary-600 mb-4">
          AGDevX Cart
        </h1>
        <p className="text-gray-600">
          TailwindCSS is configured!
        </p>
        <button className="btn-primary mt-4">
          Get Started
        </button>
      </div>
    </div>
  )
}

export default App
```

**Step 7: Verify styles**

Run:
```bash
npm run dev
```

Expected: App displays with Tailwind styling

Stop server (Ctrl+C)

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: configure TailwindCSS with custom theme"
```

Expected: Commit created

---

## Task 28: Routing Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Install React Router**

Run:
```bash
cd frontend
npm install react-router-dom
```

Expected: Package installed

**Step 2: Create page placeholders**

Create `frontend/src/pages/LoginPage.tsx`:
```typescript
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <p className="text-gray-600">Login form coming soon</p>
      </div>
    </div>
  )
}
```

Create `frontend/src/pages/RegisterPage.tsx`:
```typescript
export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Register</h1>
        <p className="text-gray-600">Registration form coming soon</p>
      </div>
    </div>
  )
}
```

Create `frontend/src/pages/DashboardPage.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <p className="text-gray-600">Dashboard content coming soon</p>
      </div>
    </div>
  )
}
```

**Step 3: Create ProtectedRoute**

Create `frontend/src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const isAuthenticated = localStorage.getItem('accessToken') !== null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

**Step 4: Setup routing**

Modify `frontend/src/App.tsx`:
```typescript
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
```

**Step 5: Verify routing**

Run:
```bash
npm run dev
```

Expected: Navigate between pages works, redirects to login when not authenticated

Stop server (Ctrl+C)

**Step 6: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: setup React Router with protected routes"
```

Expected: Commit created

---

## Task 29: TanStack Query Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/queryClient.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/types/api.ts`
- Modify: `frontend/src/main.tsx`

**Step 1: Install TanStack Query**

Run:
```bash
cd frontend
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

Expected: Packages installed

**Step 2: Create QueryClient**

Create `frontend/src/lib/queryClient.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Step 3: Create API types**

Create `frontend/src/types/api.ts`:
```typescript
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  displayName: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  displayName: string
}

export interface ApiError {
  errorCode: string
  message: string
}
```

**Step 4: Create API client**

Create `frontend/src/services/api.ts`:
```typescript
import type { ApiError } from '../types/api'

const API_BASE_URL = '/api'

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('accessToken')

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json()
      throw new Error(error.message || 'API request failed')
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
```

**Step 5: Wrap app with QueryClientProvider**

Modify `frontend/src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
```

**Step 6: Verify setup**

Run:
```bash
npm run dev
```

Expected: App runs with React Query DevTools

Stop server (Ctrl+C)

**Step 7: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: setup TanStack Query with API client"
```

Expected: Commit created

---

## Task 30: Jotai State Management

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/atoms.ts`
- Create: `frontend/src/types/auth.ts`
- Modify: `frontend/src/components/ProtectedRoute.tsx`

**Step 1: Install Jotai**

Run:
```bash
cd frontend
npm install jotai
```

Expected: Package installed

**Step 2: Create auth types**

Create `frontend/src/types/auth.ts`:
```typescript
export interface User {
  userId: string
  email: string
  displayName: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

export interface Household {
  id: string
  name: string
}
```

**Step 3: Create atoms**

Create `frontend/src/lib/atoms.ts`:
```typescript
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { AuthState, Household } from '../types/auth'

export const authAtom = atomWithStorage<AuthState>('auth', {
  user: null,
  accessToken: null,
  refreshToken: null,
})

export const isAuthenticatedAtom = atom((get) => {
  const auth = get(authAtom)
  return auth.accessToken !== null && auth.user !== null
})

export const selectedHouseholdAtom = atomWithStorage<Household | null>(
  'selectedHousehold',
  null
)

export const householdsAtom = atom<Household[]>([])
```

**Step 4: Update ProtectedRoute**

Modify `frontend/src/components/ProtectedRoute.tsx`:
```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { isAuthenticatedAtom } from '../lib/atoms'

export default function ProtectedRoute() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

**Step 5: Verify setup**

Run:
```bash
npm run dev
```

Expected: App runs, ProtectedRoute uses Jotai

Stop server (Ctrl+C)

**Step 6: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: setup Jotai state management with auth atoms"
```

Expected: Commit created

---

## Task 31: Authentication Implementation

**Files:**
- Create: `frontend/src/services/authService.ts`
- Create: `frontend/src/hooks/useAuth.ts`
- Modify: `frontend/src/pages/LoginPage.tsx`
- Modify: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create auth service**

Create `frontend/src/services/authService.ts`:
```typescript
import { api } from './api'
import type { LoginRequest, RegisterRequest, AuthResponse } from '../types/api'

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', credentials)
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data)
  },

  logout() {
    localStorage.removeItem('auth')
    localStorage.removeItem('selectedHousehold')
  },
}
```

**Step 2: Create useAuth hook**

Create `frontend/src/hooks/useAuth.ts`:
```typescript
import { useAtom } from 'jotai'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authAtom } from '../lib/atoms'
import { authService } from '../services/authService'
import type { LoginRequest, RegisterRequest } from '../types/api'

export function useAuth() {
  const [auth, setAuth] = useAtom(authAtom)
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      setAuth({
        user: {
          userId: data.userId,
          email: data.email,
          displayName: data.displayName,
        },
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      navigate('/dashboard')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (data) => {
      setAuth({
        user: {
          userId: data.userId,
          email: data.email,
          displayName: data.displayName,
        },
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      navigate('/dashboard')
    },
  })

  const logout = () => {
    authService.logout()
    setAuth({
      user: null,
      accessToken: null,
      refreshToken: null,
    })
    navigate('/login')
  }

  return {
    user: auth.user,
    isAuthenticated: auth.accessToken !== null,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
  }
}
```

**Step 3: Implement LoginPage**

Modify `frontend/src/pages/LoginPage.tsx`:
```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoggingIn, loginError } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">
          Login to AGDevX Cart
        </h1>

        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {loginError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Implement RegisterPage**

Modify `frontend/src/pages/RegisterPage.tsx`:
```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const { register, isRegistering, registerError } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    register({ email, password, displayName })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">
          Create Account
        </h1>

        {registerError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {registerError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="label">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isRegistering}
          >
            {isRegistering ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
```

**Step 5: Create Layout**

Create `frontend/src/components/Layout.tsx`:
```typescript
import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold text-primary-600">
              AGDevX Cart
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.displayName}
              </span>
              <button onClick={logout} className="btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

**Step 6: Update App routing**

Modify `frontend/src/App.tsx`:
```typescript
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
```

**Step 7: Test authentication**

Start backend:
```bash
dotnet run --project AGDevX.Cart.Api
```

In another terminal, start frontend:
```bash
cd frontend
npm run dev
```

Expected: Can register, login, logout

Stop both servers

**Step 8: Commit**

Run:
```bash
cd ..
git add .
git commit -m "feat: implement authentication with login and register"
```

Expected: Commit created

---

## Phase 7 Complete!

Frontend foundation is ready with React 19, routing, styling, state management, and authentication.

**Next:** Phase 8 - Frontend Features (Household, Inventory, Stores, Trips, SSE)
