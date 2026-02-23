// ABOUTME: Bottom tab navigation component
// ABOUTME: Mobile-first navigation with 3 tabs

import { Package, ShoppingCart, Users } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export const BottomNav = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  const tabs = [
    { path: '/inventory', label: 'Pantry', icon: Package },
    { path: '/shopping', label: 'Trips', icon: ShoppingCart },
    { path: '/household', label: 'Household', icon: Users },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg/92 backdrop-blur-xl border-t border-navy/8 z-10">
      <div className="flex justify-around px-3 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = isActive(path)
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                active ? 'text-teal' : 'text-text-tertiary'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-teal rounded-b" />
              )}
              <Icon className="w-6 h-6" strokeWidth={1.8} />
              <span className="text-[11px] font-bold tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
