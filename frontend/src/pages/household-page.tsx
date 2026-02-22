// ABOUTME: Household management page
// ABOUTME: Displays user's households with options to create or join new ones

import { Link } from 'react-router-dom'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useAuth } from '@/auth/use-auth'

export const HouseholdPage = () => {
  const { data: households, isLoading } = useHouseholdsQuery()
  const { logout } = useAuth()

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading households...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Households</h1>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          Logout
        </button>
      </div>

      {households && households.length > 0 ? (
        <div className="space-y-2 mb-4">
          {households.map((household) => (
            <Link
              key={household.id}
              to={`/household/${household.id}`}
              className="block p-4 bg-white border rounded shadow-sm hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold">
                {household.name || 'Unnamed Household'}
              </h2>
              <p className="text-sm text-gray-600">
                Created: {new Date(household.createdDate).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 mb-4">You are not a member of any households yet.</p>
      )}

      <div className="space-y-2">
        <Link
          to="/household/create"
          className="block w-full py-3 text-center bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create New Household
        </Link>
        <Link
          to="/household/join"
          className="block w-full py-3 text-center bg-green-600 text-white rounded hover:bg-green-700"
        >
          Join Household with Code
        </Link>
      </div>
    </div>
  )
}
