// ABOUTME: Household management page
// ABOUTME: Displays user's households with options to create or join new ones

import { Plus, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useAuth } from '@/auth/use-auth'
import { householdDetailPath, ROUTES } from '@/routes'

const HouseholdMembersList = ({ householdId }: { householdId: string }) => {
  const { user } = useAuth()
  const { data: members } = useHouseholdMembersQuery(householdId)

  if (!members || members.length === 0) return null

  const otherMembers = members.filter((m) => m.userId !== user?.id)
  if (otherMembers.length === 0) return null

  const names = otherMembers
    .map((m) => m.user?.name || 'Unknown')
    .join(', ')

  return (
    <p className="text-[13px] text-text-secondary font-medium mt-1 truncate">
      {names}
    </p>
  )
}

export const HouseholdPage = () => {
  const { data: households, isLoading } = useHouseholdsQuery()
  if (isLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading households...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Household</span>
        </h1>
      </div>

      {households && households.length > 0 ? (
        <div className="space-y-3 mb-6">
          {households.map((household) => (
            <Link
              key={household.id}
              to={householdDetailPath(household.id)}
              className="block p-5 bg-surface rounded-xl shadow-sm border-2 border-transparent hover:border-teal/30 hover:shadow-md transition-all"
            >
              <h2 className="font-display text-lg font-bold text-navy">
                {household.name || 'Unnamed Household'}
              </h2>
              <HouseholdMembersList householdId={household.id} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary mb-6">You are not a member of any households yet.</p>
      )}

      <div className="space-y-3">
        <Link
          to={ROUTES.HOUSEHOLD_CREATE}
          className="flex items-center justify-center gap-2 w-full py-3.5 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Household
        </Link>
        <Link
          to={ROUTES.HOUSEHOLD_JOIN}
          className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-teal/30 text-teal rounded-xl font-display font-bold hover:bg-teal/8 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Join with Code
        </Link>
      </div>
    </div>
  )
}
