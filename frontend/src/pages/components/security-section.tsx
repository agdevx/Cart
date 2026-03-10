// ABOUTME: Security section component for the settings page
// ABOUTME: Displays password change form with live requirements checklist

import { useState, useEffect } from 'react'

import { useChangePasswordMutation } from '@/apis/agdevx-cart-api/auth/change-password.mutation'

interface SecuritySectionProps {
  isEditing: boolean
  onStartEdit: () => void
  onCancel: () => void
  onSaved: () => void
  successMessage?: string
}

export const SecuritySection = ({ isEditing, onStartEdit, onCancel, onSaved, successMessage }: SecuritySectionProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const changePasswordMutation = useChangePasswordMutation()

  //== Reset form state when exiting edit mode
  useEffect(() => {
    if (isEditing) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
    }
  }, [isEditing])

  //== Password validation
  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber
  const passwordsMatch = newPassword === confirmPassword

  const isFormValid = currentPassword.length > 0 && isPasswordValid && passwordsMatch && confirmPassword.length > 0

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${
      hasError ? 'border-coral' : 'border-navy/10'
    }`

  const handleSave = async () => {
    setPasswordError('')

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      onSaved()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Incorrect password')) {
        setPasswordError('Incorrect password')
      }
    }
  }

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Security</span>
        </div>
        <div className="rounded-xl bg-surface">
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-text-tertiary">Password</div>
              <div className="text-sm text-navy-soft">••••••••</div>
            </div>
            <button onClick={onStartEdit} className="text-xs font-semibold text-teal">Change</button>
          </div>
          {successMessage && (
            <div className="px-4 pb-3">
              <p className="text-sm text-teal">{successMessage}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Security</span>
      </div>
      <div className="rounded-xl bg-surface p-4 space-y-3">
        <div>
          <label htmlFor="security-current-password" className="block text-xs text-text-tertiary mb-1">Current Password</label>
          <input
            id="security-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setPasswordError('')
            }}
            maxLength={128}
            className={inputClass(!!passwordError)}
            autoComplete="current-password"
          />
          {passwordError && <p className="mt-1 text-sm text-coral">{passwordError}</p>}
        </div>
        <div>
          <label htmlFor="security-new-password" className="block text-xs text-text-tertiary mb-1">New Password</label>
          <input
            id="security-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            maxLength={128}
            className={inputClass(false)}
            autoComplete="new-password"
          />
          <div className="mt-2 text-xs text-text-secondary">
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
        </div>
        <div>
          <label htmlFor="security-confirm-password" className="block text-xs text-text-tertiary mb-1">Confirm New Password</label>
          <input
            id="security-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            maxLength={128}
            className={inputClass(false)}
            autoComplete="new-password"
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-bg-warm rounded-xl font-display font-bold text-navy-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid || changePasswordMutation.isPending}
            className="flex-1 py-2.5 bg-teal text-white rounded-xl font-display font-bold disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {changePasswordMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
