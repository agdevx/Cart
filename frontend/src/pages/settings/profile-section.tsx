// ABOUTME: Profile section component for the settings page
// ABOUTME: Displays user name and email in view mode, with inline editing and conditional password field

import { useMemo, useState } from 'react'

import type { UpdateProfileResponse } from '@/apis/agdevx-cart-api/auth/update-profile.mutation'
import { useUpdateProfileMutation } from '@/apis/agdevx-cart-api/auth/update-profile.mutation'
import type { User } from '@/apis/agdevx-cart-api/models/user'
import { useFieldValidation } from '@/services/use-field-validation.service'
import { FormField } from '@/shared/form-field'
import { Spinner } from '@/shared/spinner'
import { isEmail, isRequired, maxLength } from '@/utils/validation-rules'

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
  const [formKey, setFormKey] = useState(0)

  const updateProfileMutation = useUpdateProfileMutation()

  //== Reset form state when entering edit mode (adjust-state-during-render pattern)
  const [prevIsEditing, setPrevIsEditing] = useState(false)
  if (isEditing && !prevIsEditing) {
    setPrevIsEditing(true)
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setCurrentPassword('')
    setFormKey((k) => k + 1)
  }
  if (!isEditing && prevIsEditing) {
    setPrevIsEditing(false)
  }

  const emailChanged = email.toLowerCase() !== (user.email ?? '').toLowerCase()

  const schema = useMemo(() => ({
    name: [isRequired('Name'), maxLength(64)],
    email: [isRequired('Email'), isEmail(), maxLength(254)],
    ...(emailChanged ? { currentPassword: [isRequired('Password')] } : {}),
  }), [emailChanged])

  const values = useMemo(
    () => ({ name, email, ...(emailChanged ? { currentPassword } : {}) }),
    [name, email, emailChanged, currentPassword]
  )

  const { errors, touched, handleBlur, handleChange, validateAll, setFieldError, isValid } = useFieldValidation(schema, values)

  const borderClass = (field: string) =>
    touched[field] && !errors[field]
      ? 'border-teal border-2'
      : errors[field]
        ? 'border-coral border-2'
        : 'border-navy/10'

  const handleSave = async () => {
    if (!validateAll()) return

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
        setFieldError('email', 'This email is already taken')
      } else if (errorMessage.includes('Incorrect password')) {
        setFieldError('currentPassword', 'Incorrect password')
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
      <div key={formKey} className="rounded-xl bg-surface p-4">
        <FormField label="Name" htmlFor="profile-name" error={errors.name} labelSizeClassName="text-xs" labelDefaultColor="text-text-tertiary">
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); handleChange('name', e.target.value) }}
            onBlur={() => handleBlur('name')}
            maxLength={64}
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('name')}`}
            autoComplete="name"
          />
        </FormField>
        <FormField label="Email" htmlFor="profile-email" error={errors.email} labelSizeClassName="text-xs" labelDefaultColor="text-text-tertiary">
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); handleChange('email', e.target.value) }}
            onBlur={() => handleBlur('email')}
            maxLength={254}
            className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${borderClass('email')}`}
            autoComplete="email"
          />
        </FormField>

        {emailChanged && (
          <div className="border-2 border-dashed border-teal/30 rounded-xl p-3 bg-teal/[0.03]">
            <FormField label="Current Password" htmlFor="profile-current-password" error={errors.currentPassword} labelSizeClassName="text-xs" labelDefaultColor="text-text-tertiary">
              <input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); handleChange('currentPassword', e.target.value) }}
                onBlur={() => handleBlur('currentPassword')}
                maxLength={128}
                className={`w-full px-4 py-3 border rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors.currentPassword ? 'border-coral border-2' : 'border-navy/10'}`}
                autoComplete="current-password"
              />
              <p className="mt-1 text-xs text-text-tertiary">Required to change your email</p>
            </FormField>
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
            disabled={!isValid || updateProfileMutation.isPending}
            className="flex flex-1 items-center justify-center py-2.5 bg-teal text-white rounded-xl font-display font-bold disabled:bg-bg-warm disabled:text-text-tertiary disabled:cursor-not-allowed"
          >
            {updateProfileMutation.isPending ? <Spinner /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
