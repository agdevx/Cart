// ABOUTME: Registration page component
// ABOUTME: Handles user registration with validation and auto-login

import { useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';

import { useRegisterMutation } from '@/apis/agdevx-cart-api/auth/register.mutation';
import { useAuth } from '@/auth/use-auth';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [serverEmailError, setServerEmailError] = useState('');
  const [touched, setTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
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

  // Confirm password validation
  const passwordsMatch = password === confirmPassword;

  // Display name validation
  const isDisplayNameValid = displayName.trim().length > 0;

  // Form validation
  const isFormValid = isEmailValid && isPasswordValid && passwordsMatch && confirmPassword.length > 0 && isDisplayNameValid;

  // Compute error messages directly from state
  const emailError = touched.email
    ? !email.trim()
      ? 'Email is required'
      : !isEmailValid
      ? 'Please enter a valid email address'
      : serverEmailError
    : '';

  const passwordError = touched.password
    ? !password
      ? 'Password is required'
      : !hasMinLength
      ? 'Password must be at least 8 characters'
      : !hasUppercase
      ? 'Password must contain at least one uppercase letter'
      : !hasNumber
      ? 'Password must contain at least one number'
      : ''
    : '';

  const confirmPasswordError = touched.confirmPassword
    ? !confirmPassword
      ? 'Please confirm your password'
      : !passwordsMatch
      ? 'Passwords do not match'
      : ''
    : '';

  const displayNameError = touched.displayName && !displayName.trim()
    ? 'Display name is required'
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setServerEmailError('');

    try {
      const response = await registerMutation.mutateAsync({
        email,
        password,
        displayName,
      });

      setAuth({
          id: response.userId,
          email: response.email,
          displayName: response.displayName,
          createdBy: null,
          createdDate: new Date().toISOString(),
          modifiedBy: null,
          modifiedDate: null,
        });

      navigate('/shopping');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already exists') || errorMessage.includes('DUPLICATE_EMAIL')) {
        setServerEmailError('This email is already registered');
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
              onBlur={() => setTouched({ ...touched, email: true })}
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
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched({ ...touched, password: true })}
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

          {/* Confirm Password Field */}
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched({ ...touched, confirmPassword: true })}
              placeholder="Confirm your password"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                confirmPasswordError ? 'border-red-500' : 'border-gray-300'
              }`}
              autoComplete="new-password"
            />
            {confirmPasswordError && (
              <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
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
              onBlur={() => setTouched({ ...touched, displayName: true })}
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
