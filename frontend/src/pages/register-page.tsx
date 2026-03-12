// ABOUTME: Registration page component
// ABOUTME: Handles user registration with validation and auto-login

import { useMemo, useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';

import { useRegisterMutation } from '@/apis/agdevx-cart-api/auth/register.mutation';
import { ApiError } from '@/apis/api-error';
import { useAuth } from '@/auth/use-auth';
import { useFieldValidation } from '@/hooks/use-field-validation';
import { ROUTES } from '@/routes';
import { isEmail, isRequired, matchesField, maxLength, minLength, passwordStrength } from '@/utils/validation-rules';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const { setAuth } = useAuth();

  const schema = useMemo(() => ({
    name: [isRequired('Name'), maxLength(64)],
    email: [isRequired('Email'), isEmail(), maxLength(254)],
    password: [isRequired('Password'), minLength(8), maxLength(128), passwordStrength()],
    confirmPassword: [isRequired('Confirm password'), matchesField('password', 'Passwords')],
  }), []);

  const values = useMemo(() => ({ name, email, password, confirmPassword }), [name, email, password, confirmPassword]);

  const { errors, touched, handleBlur, handleChange, validateAll, setFieldError, isValid } = useFieldValidation(schema, values);

  // Password requirements checklist — reads from password state directly
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    try {
      const response = await registerMutation.mutateAsync({
        email,
        password,
        name: name.trim(),
      });

      setAuth({
          id: response.userId,
          email: response.email,
          name: response.name,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        });

      navigate(ROUTES.SHOPPING);
    } catch (error) {
      if (error instanceof ApiError) {
        const body = error.body as Record<string, unknown> | null
        if (body?.errorCode === 'DUPLICATE_EMAIL') {
          setFieldError('email', 'This email is already registered')
        }
      }
      // Other errors: no toast (auth mutation), inline state via registerMutation.isError
    }
  };

  const borderClass = (field: string) =>
    touched[field] && !errors[field]
      ? 'border-teal border-2'
      : errors[field]
        ? 'border-coral border-2'
        : 'border-navy/10';

  const labelClass = (field: string) =>
    errors[field] ? 'text-coral' : 'text-navy-soft';

  return (
    <div id="main-content" className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-surface p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-navy mb-1">
          AGDevX <span className="text-teal">Cart</span>
        </h1>
        <p className="text-text-secondary text-sm mb-6">Create your account</p>
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
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

          {/* Password Field */}
          <div className="mb-4">
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
              autoComplete="new-password"
            />

            {/* Password Requirements */}
            <div className="mt-2 text-xs text-text-secondary">
              <p className="font-semibold mb-1">Requirements:</p>
              <div className="space-y-1">
                <p className={hasMinLength ? 'text-teal' : ''}>
                  {hasMinLength ? '✓' : '○'} 8+ characters
                </p>
                <p className={hasUppercase ? 'text-teal' : ''}>
                  {hasUppercase ? '✓' : '○'} One uppercase letter
                </p>
                <p className={hasNumber ? 'text-teal' : ''}>
                  {hasNumber ? '✓' : '○'} One number
                </p>
              </div>
            </div>

            {errors.password && (
              <p className="mt-1 text-sm text-coral">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="mb-4">
            <label htmlFor="confirmPassword" className={`block text-sm font-semibold ${labelClass('confirmPassword')} mb-2`}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); handleChange('confirmPassword', e.target.value); }}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Confirm your password"
              maxLength={128}
              className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('confirmPassword')}`}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-coral">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Name Field */}
          <div className="mb-6">
            <label htmlFor="name" className={`block text-sm font-semibold ${labelClass('name')} mb-2`}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); handleChange('name', e.target.value); }}
              onBlur={() => handleBlur('name')}
              placeholder="Enter your name"
              maxLength={64}
              className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('name')}`}
              autoComplete="name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-coral">{errors.name}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={registerMutation.isPending || !isValid}
            className="w-full bg-teal text-white py-3 px-4 rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
          >
            {registerMutation.isPending ? 'Signing up...' : 'Sign up'}
          </button>

          {/* Link to Login */}
          <p className="mt-4 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="text-teal hover:text-teal-light font-semibold">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
