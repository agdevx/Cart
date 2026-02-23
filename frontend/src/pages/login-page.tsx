// ABOUTME: Login page component
// ABOUTME: Simple username-only authentication for MVP

import { useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'

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
      setAuth({
          id: response.userId,
          email: response.email,
          displayName: response.displayName,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        })
      navigate('/shopping')
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-navy mb-1">
          AGDevX <span className="text-teal">Cart</span>
        </h1>
        <p className="text-text-secondary text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-semibold text-navy-soft mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              autoComplete="email"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-semibold text-navy-soft mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending || !email.trim() || !password.trim()}
            className="w-full bg-teal text-white py-3 px-4 rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </button>
          {loginMutation.isError && (
            <p className="mt-4 text-sm text-coral">
              Login failed. Please try again.
            </p>
          )}
        </form>
        {/* Link to Register */}
        <p className="mt-4 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal hover:text-teal-light font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
