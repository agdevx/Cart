// ABOUTME: Settings page with user preferences and account actions
// ABOUTME: Contains logout functionality moved from the household page

import { LogOut } from 'lucide-react'

import { useAuth } from '@/auth/use-auth'

import { PageHeader } from './components/page-header'

export const SettingsPage = () => {
  const { logout } = useAuth()

  return (
    <div className="pb-4">
      <PageHeader>Settings</PageHeader>
      <div className="px-5">
      <div className="space-y-3">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-coral/30 text-coral rounded-xl font-display font-bold hover:bg-coral/8 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
      </div>
    </div>
  )
}
