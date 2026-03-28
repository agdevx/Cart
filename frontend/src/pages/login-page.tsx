// ABOUTME: Login page component
// ABOUTME: Simple username-only authentication for MVP

import { useMemo, useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'

import { useLoginMutation } from '@/apis/agdevx-cart-api/auth/login.mutation'
import { useAuth } from '@/auth/use-auth'
import { useFieldValidation } from '@/hooks/use-field-validation'
import { ROUTES } from '@/routes'
import { isEmail, isRequired } from '@/utils/validation-rules'

import { Spinner } from './components/spinner'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const loginMutation = useLoginMutation()
  const { setAuth } = useAuth()

  const schema = useMemo(() => ({
    email: [isRequired('Email'), isEmail()],
    password: [isRequired('Password')],
  }), [])

  const values = useMemo(() => ({ email, password }), [email, password])

  const { errors, touched, handleBlur, handleChange, validateAll, setFieldError, isValid } = useFieldValidation(schema, values)

  const borderClass = (field: string) =>
    touched[field] && !errors[field]
      ? 'border-teal border-2'
      : errors[field]
        ? 'border-coral border-2'
        : 'border-navy/10'

  const labelClass = (field: string) =>
    errors[field] ? 'text-coral' : 'text-navy-soft'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAll()) return

    try {
      const response = await loginMutation.mutateAsync({ email, password })
      setAuth({
          id: response.userId,
          email: response.email,
          name: response.name,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        })
      navigate(ROUTES.SHOPPING)
    } catch {
      setFieldError('email', 'Invalid email or password')
    }
  }

  return (
    <div id="main-content" className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-navy mb-1">
          AGDevX <span className="text-teal">Cart</span>
        </h1>
        <p className="text-text-secondary text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className={`block text-sm font-semibold ${labelClass('email')} mb-2`}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); handleChange('email', e.target.value); }}
              onBlur={() => handleBlur('email')}
              placeholder="Enter your email"
              maxLength={254}
              className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('email')}`}
              autoComplete="email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-coral">{errors.email}</p>
            )}
          </div>
          <div className="mb-6">
            <label htmlFor="password" className={`block text-sm font-semibold ${labelClass('password')} mb-2`}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); handleChange('password', e.target.value); }}
              onBlur={() => handleBlur('password')}
              placeholder="Enter your password"
              maxLength={128}
              className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('password')}`}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-coral">{errors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loginMutation.isPending || !isValid}
            className="w-full bg-teal text-white py-3 px-4 rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
          >
            {loginMutation.isPending ? <Spinner /> : 'Login'}
          </button>
        </form>
        {/* Link to Register */}
        <p className="mt-4 text-center text-sm text-text-secondary">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="text-teal hover:text-teal-light font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
