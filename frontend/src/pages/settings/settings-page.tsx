// ABOUTME: Settings page with user profile management and account actions
// ABOUTME: iOS-style grouped list with Preferences, Profile, Security sections, and logout

import { useState } from 'react'

import { LogOut } from 'lucide-react'

import type { UpdateProfileResponse } from '@/apis/agdevx-cart-api/auth/update-profile.mutation'
import { useAuth } from '@/auth/use-auth'
import { PageHeader } from '@/shared/page-header'

import { PreferencesSection } from './preferences-section'
import { ProfileSection } from './profile-section'
import { SecuritySection } from './security-section'

type EditingSection = 'none' | 'profile' | 'password'

export const SettingsPage = () => {
  const { user, setAuth, logout } = useAuth()
  const [editingSection, setEditingSection] = useState<EditingSection>('none')
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('')

  const handleProfileSaved = (response: UpdateProfileResponse) => {
    setAuth({ ...user!, id: response.userId, email: response.email, name: response.name })
    setEditingSection('none')
  }

  const handlePasswordSaved = () => {
    setEditingSection('none')
    setPasswordSuccessMessage('Password updated')
    setTimeout(() => setPasswordSuccessMessage(''), 3000)
  }

  if (!user) return null

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Your <span className="text-teal">Settings</span></PageHeader>
      <div className="px-5 space-y-4">
        <PreferencesSection />
        <ProfileSection
          user={user}
          isEditing={editingSection === 'profile'}
          onStartEdit={() => setEditingSection('profile')}
          onCancel={() => setEditingSection('none')}
          onSaved={handleProfileSaved}
        />
        <SecuritySection
          isEditing={editingSection === 'password'}
          onStartEdit={() => setEditingSection('password')}
          onCancel={() => setEditingSection('none')}
          onSaved={handlePasswordSaved}
          successMessage={passwordSuccessMessage}
        />
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-coral/30 text-coral rounded-xl font-display font-bold hover:bg-coral/8 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  )
}
