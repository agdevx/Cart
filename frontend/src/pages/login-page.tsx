// ABOUTME: Login page component
// ABOUTME: Simple username-only authentication for MVP

import { useMemo, useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'

import { ShoppingCart } from 'lucide-react'

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
    <div id="main-content" className="min-h-screen flex flex-col animate-fade-in">
      {/* Brand Panel */}
      <div className="relative overflow-hidden px-6 pt-12 pb-16 text-center" style={{ background: 'linear-gradient(to bottom, #1B2138, #2E344F)' }}>
        {/* Geometric accents */}
        <div className="absolute top-6 right-4 w-20 h-20 rounded-full border-2 opacity-10" style={{ borderColor: '#38BDF8' }} />
        <div className="absolute top-16 right-12 w-10 h-10 rounded-full border-2 opacity-10" style={{ borderColor: '#38BDF8' }} />
        <div className="absolute bottom-8 left-2 w-16 h-16 rounded-full border-2 opacity-8" style={{ borderColor: '#A78BFA' }} />
        <div className="absolute bottom-16 left-10 w-8 h-8 rounded-full border-2 opacity-8" style={{ borderColor: '#F59E0B' }} />

        {/* Cart icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[18px]" style={{ backgroundColor: 'rgba(26,171,138,0.15)' }}>
          <ShoppingCart size={32} className="text-teal-light" />
        </div>

        {/* Logo */}
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-white">
          AGDevX <span className="text-teal-light">Cart</span>
        </h1>

        {/* Tagline */}
        <p className="mt-1 text-[13px] font-semibold text-white/45">Grocery runs, sorted</p>

        {/* Feature pills */}
        <div className="mt-5 flex justify-center gap-2">
          <span className="rounded-full py-[5px] px-3 text-[11px] font-bold tracking-[0.3px]" style={{ color: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.15)' }}>
            Shared Lists
          </span>
          <span className="rounded-full py-[5px] px-3 text-[11px] font-bold tracking-[0.3px]" style={{ color: '#34D399', backgroundColor: 'rgba(52,211,153,0.15)' }}>
            Pantry
          </span>
          <span className="rounded-full py-[5px] px-3 text-[11px] font-bold tracking-[0.3px]" style={{ color: '#A78BFA', backgroundColor: 'rgba(139,92,246,0.15)' }}>
            Trip History
          </span>
        </div>
      </div>

      {/* Form Panel */}
      <div className="relative z-10 -mt-4 flex flex-1 flex-col rounded-t-3xl bg-surface p-7">
        <h2 className="font-display text-xl font-extrabold text-navy mb-6">Sign in</h2>

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
