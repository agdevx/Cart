// ABOUTME: Login page component
// ABOUTME: Simple username-only authentication for MVP

import { useState } from 'react'
import { useLoginMutation } from '@/apis/agdevx-cart-api/auth/login.mutation'
import { useAuth } from '@/auth/use-auth'

export const LoginPage = () => {
  const [username, setUsername] = useState('')
  const loginMutation = useLoginMutation()
  const { setAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    try {
      const response = await loginMutation.mutateAsync({ username })
      setAuth(response.token, response.user)
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          AGDevX Cart
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="username"
            />
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending || !username.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </button>
          {loginMutation.isError && (
            <p className="mt-4 text-sm text-red-600">
              Login failed. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
