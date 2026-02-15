// ABOUTME: Login page component
// ABOUTME: Simple username-only authentication for MVP

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoginMutation } from '@/apis/agdevx-cart-api/auth/login.mutation'
import { useAuth } from '@/auth/use-auth'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const { setAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    try {
      const response = await loginMutation.mutateAsync({ email, password })
      setAuth(
        {
          id: response.userId,
          email: response.email,
          displayName: response.displayName
        },
        response.accessToken
      )
      navigate('/shopping')
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending || !email.trim() || !password.trim()}
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
