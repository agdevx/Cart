// ABOUTME: Household management page
// ABOUTME: Displays user's households with options to create or join new ones

import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Users } from 'lucide-react'

import { useHouseholdMembersQuery } from '@/apis/agdevx-cart-api/household/use-household-members.query'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useAuth } from '@/auth/use-auth'
import { householdDetailPath, ROUTES } from '@/routes'
import { EmptyState } from '@/shared/empty-state'
import { Fab } from '@/shared/fab'
import { PageHeader } from '@/shared/page-header'
import { sortHouseholds } from '@/utils/sort-households'

const HouseholdMembersList = ({ householdId }: { householdId: string }) => {
  const { user } = useAuth()
  const { data: members } = useHouseholdMembersQuery(householdId)

  if (!members || members.length === 0) return null

  const otherMembers = members.filter((m) => m.userId !== user?.id)
  const memberCount = members.length
  const names = otherMembers
    .map((m) => m.user?.name || 'Unknown')
    .join(', ')

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[13px] text-text-tertiary font-medium">{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
      {otherMembers.length > 0 && (
        <p className="text-[13px] text-text-secondary font-medium truncate">· {names}</p>
      )}
    </div>
  )
}

export const HouseholdPage = () => {
  const navigate = useNavigate()
  const { data: households, isLoading } = useHouseholdsQuery()

  const sortedHouseholds = useMemo(() => sortHouseholds(households || []), [households])

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
      <PageHeader>Your <span className="text-teal">{(households?.length ?? 0) > 1 ? 'Households' : 'Household'}</span></PageHeader>
      <div className="px-5">
      {households && households.length > 0 ? (
        <div className="space-y-3 mb-6">
          {sortedHouseholds.map((household) => (
            <Link
              key={household.id}
              to={householdDetailPath(household.id)}
              className="block p-5 bg-surface rounded-xl shadow-sm border-2 border-transparent"
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
          actionLabel="Create Household"
          onAction={() => navigate(ROUTES.HOUSEHOLD_CREATE)}
        />
      )}

      </div>

      <Fab
        actions={[
          { label: 'Create Household', onClick: () => navigate(ROUTES.HOUSEHOLD_CREATE) },
          { label: 'Join with Code', onClick: () => navigate(ROUTES.HOUSEHOLD_JOIN) },
        ]}
      />
    </div>
  )
}
