// ABOUTME: TanStack Query client with global error handlers, smart retry, and caching
// ABOUTME: MutationCache shows toast on failures; QueryCache redirects to login on 401

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { AUTH_USER_STORAGE_KEY } from '@/state/auth-atoms'

import { ApiError } from '../api-error'

/**
 * Handle 401 by clearing auth state and redirecting to login.
 * Only redirects if there's an existing session (prevents redirect during login attempts).
 * Uses window.location.href because cache callbacks are outside the React component tree.
 */
export function handleUnauthorized(): void {
  if (localStorage.getItem(AUTH_USER_STORAGE_KEY)) {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    window.location.href = '/login'
  }
}

/**
 * Smart retry function: skip retry for non-retryable HTTP errors (4xx, 429),
 * allow one retry for server errors and network failures.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && !error.isRetryable) return false
  return failureCount < 1
}

const queryCache = new QueryCache({
  onError: (error) => {
    if (error instanceof ApiError && error.isUnauthorized) {
      handleUnauthorized()
    }
  },
})

const mutationCache = new MutationCache({
  onError: (error, _variables, _onMutateResult, mutation) => {
    if (error instanceof ApiError && error.isUnauthorized) {
      handleUnauthorized()
      return
    }

    // Skip toast for mutations that handle errors inline
    const key = mutation.options.mutationKey
    if (key && key[0] === 'auth') return
    if (mutation.options.meta?.handlesErrors) return

    toast.error('Something went wrong. Please try again.')
  },
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: shouldRetry,
    },
  },
})
