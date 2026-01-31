// ABOUTME: Bottom tab navigation component
// ABOUTME: Mobile-first navigation with 3 tabs

import { Link, useLocation } from 'react-router-dom'

export const BottomNav = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex justify-around">
        <Link
          to="/inventory"
          className={`flex-1 py-3 text-center ${
            isActive('/inventory') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          Inventory
        </Link>
        <Link
          to="/shopping"
          className={`flex-1 py-3 text-center ${
            isActive('/shopping') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          Shopping
        </Link>
        <Link
          to="/household"
          className={`flex-1 py-3 text-center ${
            isActive('/household') ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          Household
        </Link>
      </div>
    </nav>
  )
}
