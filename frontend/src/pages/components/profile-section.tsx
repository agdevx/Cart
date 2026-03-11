// ABOUTME: Profile section component for the settings page
// ABOUTME: Displays user name and email in view mode, with inline editing and conditional password field

import { useEffect,useState } from 'react'

import type { UpdateProfileResponse } from '@/apis/agdevx-cart-api/auth/update-profile.mutation'
import { useUpdateProfileMutation } from '@/apis/agdevx-cart-api/auth/update-profile.mutation'
import type { User } from '@/apis/agdevx-cart-api/models/user'

interface ProfileSectionProps {
  user: User
  isEditing: boolean
  onStartEdit: () => void
  onCancel: () => void
  onSaved: (response: UpdateProfileResponse) => void
}

export const ProfileSection = ({ user, isEditing, onStartEdit, onCancel, onSaved }: ProfileSectionProps) => {
  const [name, setName] = useState(user.name ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const updateProfileMutation = useUpdateProfileMutation()

  //== Reset form state when entering/exiting edit mode
  useEffect(() => {
    if (isEditing) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setCurrentPassword('')
      setEmailError('')
      setPasswordError('')
    }
  }, [isEditing, user.name, user.email])

  const emailChanged = email.toLowerCase() !== (user.email ?? '').toLowerCase()
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isNameValid = name.trim().length > 0
  const isFormValid = isNameValid && isEmailValid && (!emailChanged || currentPassword.length > 0)

  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${
      hasError ? 'border-coral' : 'border-navy/10'
    }`

  const handleSave = async () => {
    setEmailError('')
    setPasswordError('')

    try {
      const response = await updateProfileMutation.mutateAsync({
        name: name.trim(),
        email,
        ...(emailChanged ? { currentPassword } : {}),
      })
      onSaved(response)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('already exists')) {
        setEmailError('This email is already taken')
      } else if (errorMessage.includes('Incorrect password')) {
        setPasswordError('Incorrect password')
      }
    }
  }

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Profile</span>
          <button onClick={onStartEdit} className="text-xs font-semibold text-teal">Edit</button>
        </div>
        <div className="rounded-xl bg-surface">
          <div className="px-4 py-3">
            <div className="text-xs text-text-tertiary">Name</div>
            <div className="text-sm text-navy-soft">{user.name}</div>
          </div>
          <div className="border-t border-bg px-4 py-3">
            <div className="text-xs text-text-tertiary">Email</div>
            <div className="text-sm text-navy-soft">{user.email}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Profile</span>
      </div>
      <div className="rounded-xl bg-surface p-4 space-y-3">
        <div>
          <label htmlFor="profile-name" className="block text-xs text-text-tertiary mb-1">Name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            className={inputClass(false)}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="profile-email" className="block text-xs text-text-tertiary mb-1">Email</label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError('')
            }}
            maxLength={254}
            className={inputClass(!!emailError)}
            autoComplete="email"
          />
          {emailError && <p className="mt-1 text-sm text-coral">{emailError}</p>}
        </div>

        {emailChanged && (
          <div className="border-2 border-dashed border-teal/30 rounded-xl p-3 bg-teal/[0.03]">
            <label htmlFor="profile-current-password" className="block text-xs text-text-tertiary mb-1">Current Password</label>
            <input
              id="profile-current-password"
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
            <p className="mt-1 text-xs text-text-tertiary">Required to change your email</p>
            {passwordError && <p className="mt-1 text-sm text-coral">{passwordError}</p>}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border-2 border-bg-warm rounded-xl font-display font-bold text-navy-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid || updateProfileMutation.isPending}
            className="flex-1 py-2.5 bg-teal text-white rounded-xl font-display font-bold disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
