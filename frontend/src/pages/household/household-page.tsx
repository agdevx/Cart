// ABOUTME: Household management page
// ABOUTME: Displays user's households with options to create or join new ones

import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Plus, UserPlus, Users } from 'lucide-react'

import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useAuth } from '@/auth/use-auth'
import { householdDetailPath, ROUTES } from '@/routes'
import { EmptyState } from '@/shared/empty-state'
import { PageHeader } from '@/shared/page-header'

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

  const sortedHouseholds = useMemo(
    () => [...(households || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [households]
  )

  if (isLoading) {
    return (
      <div className="px-5 pt-7">
        <div className="h-9 w-44 bg-navy/8 animate-pulse rounded-lg mb-6" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="p-5 bg-surface rounded-2xl shadow-sm space-y-2">
              <div className="h-3 w-1/2 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2.5 w-1/4 bg-navy/8 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Your <span className="text-teal">Household</span></PageHeader>
      <div className="px-5">
      {households && households.length > 0 ? (
        <div className="space-y-3 mb-6">
          {sortedHouseholds.map((household) => (
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
        <EmptyState
          icon={Users}
          title="No households yet"
          subtitle="Create or join a household to share shopping trips"
        />
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
    </div>
  )
}
