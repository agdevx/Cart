// ABOUTME: Security section component for the settings page
// ABOUTME: Displays password change form with live requirements checklist

import { useMemo, useState } from 'react'

import { useChangePasswordMutation } from '@/apis/agdevx-cart-api/auth/change-password.mutation'
import { useFieldValidation } from '@/hooks/use-field-validation'
import { isRequired, matchesField, maxLength, minLength, passwordStrength } from '@/utils/validation-rules'

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
  const [formKey, setFormKey] = useState(0)

  const changePasswordMutation = useChangePasswordMutation()

  //== Reset form state when entering edit mode (adjust-state-during-render pattern)
  const [prevIsEditing, setPrevIsEditing] = useState(false)
  if (isEditing && !prevIsEditing) {
    setPrevIsEditing(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setFormKey((k) => k + 1)
  }
  if (!isEditing && prevIsEditing) {
    setPrevIsEditing(false)
  }

  const schema = useMemo(() => ({
    currentPassword: [isRequired('Current password')],
    newPassword: [isRequired('New password'), minLength(8), maxLength(128), passwordStrength()],
    confirmPassword: [isRequired('Confirm password'), matchesField('newPassword', 'Passwords')],
  }), [])

  const values = useMemo(
    () => ({ currentPassword, newPassword, confirmPassword }),
    [currentPassword, newPassword, confirmPassword]
  )

  const { errors, touched, handleBlur, handleChange, validateAll, setFieldError, isValid } = useFieldValidation(schema, values)

  //== Password requirements checklist — read directly from state
  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)

  const borderClass = (field: string) =>
    touched[field] && !errors[field]
      ? 'border-teal border-2'
      : errors[field]
        ? 'border-coral border-2'
        : 'border-navy/10'

  const handleSave = async () => {
    if (!validateAll()) return

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      onSaved()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('Incorrect password')) {
        setFieldError('currentPassword', 'Incorrect password')
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
      <div key={formKey} className="rounded-xl bg-surface p-4 space-y-3">
        <div>
          <label htmlFor="security-current-password" className={`block text-xs mb-1 ${errors.currentPassword ? 'text-coral' : 'text-text-tertiary'}`}>Current Password</label>
          <input
            id="security-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); handleChange('currentPassword', e.target.value) }}
            onBlur={() => handleBlur('currentPassword')}
            maxLength={128}
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('currentPassword')}`}
            autoComplete="current-password"
          />
          {errors.currentPassword && <p className="mt-1 text-sm text-coral">{errors.currentPassword}</p>}
        </div>
        <div>
          <label htmlFor="security-new-password" className={`block text-xs mb-1 ${errors.newPassword ? 'text-coral' : 'text-text-tertiary'}`}>New Password</label>
          <input
            id="security-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); handleChange('newPassword', e.target.value) }}
            onBlur={() => handleBlur('newPassword')}
            maxLength={128}
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('newPassword')}`}
            autoComplete="new-password"
          />
          {errors.newPassword && <p className="mt-1 text-sm text-coral">{errors.newPassword}</p>}
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
          <label htmlFor="security-confirm-password" className={`block text-xs mb-1 ${errors.confirmPassword ? 'text-coral' : 'text-text-tertiary'}`}>Confirm New Password</label>
          <input
            id="security-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); handleChange('confirmPassword', e.target.value) }}
            onBlur={() => handleBlur('confirmPassword')}
            maxLength={128}
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('confirmPassword')}`}
            autoComplete="new-password"
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-coral">{errors.confirmPassword}</p>}
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
            disabled={!isValid || changePasswordMutation.isPending}
            className="flex-1 py-2.5 bg-teal text-white rounded-xl font-display font-bold disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {changePasswordMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
