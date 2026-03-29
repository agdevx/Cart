import { MemoryRouter } from 'react-router-dom'

import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as membersQueryModule from '@/apis/agdevx-cart-api/household/use-household-members.query'
import * as householdsQueryModule from '@/apis/agdevx-cart-api/household/use-households.query'
import type { Household, HouseholdMember } from '@/apis/agdevx-cart-api/models/household'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import { HouseholdPage } from '../household-page'

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HouseholdPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockHouseholds: Household[] = [
  {
    id: 'h1',
    name: 'Test Household',
    createdBy: 'user-1',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
]

const mockMembers: HouseholdMember[] = [
  {
    id: 'm1',
    householdId: 'h1',
    userId: 'current-user',
    joinedAt: '2024-01-01',
    role: 'owner',
    user: { name: 'Me' },
    createdBy: 'current-user',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'm2',
    householdId: 'h1',
    userId: 'other-user',
    joinedAt: '2024-01-15',
    role: 'member',
    user: { name: 'Alice' },
    createdBy: 'other-user',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: 'm3',
    householdId: 'h1',
    userId: 'third-user',
    joinedAt: '2024-02-01',
    role: 'member',
    user: { name: 'Bob' },
    createdBy: 'third-user',
    createdDate: '2024-02-01',
    modifiedBy: null,
    modifiedDate: null,
  },
]

const setupMocks = (overrides?: {
  userId?: string
  households?: Household[]
  members?: HouseholdMember[]
  householdsLoading?: boolean
}) => {
  const {
    userId = 'current-user',
    households = mockHouseholds,
    members = mockMembers,
    householdsLoading = false,
  } = overrides ?? {}

  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: userId, email: 'test@test.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })

  vi.spyOn(householdsQueryModule, 'useHouseholdsQuery').mockReturnValue({
    data: households,
    isLoading: householdsLoading,
  } as UseQueryResult<Household[]>)

  vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
    data: members,
    isLoading: false,
  } as UseQueryResult<HouseholdMember[]>)
}

describe('HouseholdPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    setupMocks({ householdsLoading: true })

    const { container } = renderPage()

    //== Skeleton loader divs should be visible with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders empty state when no households', () => {
    setupMocks({ households: [] })

    renderPage()

    expect(screen.getByText('No households yet')).toBeInTheDocument()
  })

  it('renders household cards', () => {
    setupMocks()

    renderPage()

    expect(screen.getByText('Test Household')).toBeInTheDocument()
  })

  it('excludes current user from member names on household card', () => {
    setupMocks()

    renderPage()

    //== Should show member count and other members but not the current user
    expect(screen.getByText('3 members')).toBeInTheDocument()
    expect(screen.getByText('· Alice, Bob')).toBeInTheDocument()
    //== The current user's member name ('Me') should not appear in the member list
    expect(screen.queryByText('Me')).not.toBeInTheDocument()
  })

  it('returns null for member list when current user is the only member', () => {
    const soloMembers: HouseholdMember[] = [
      {
        id: 'm1',
        householdId: 'h1',
        userId: 'current-user',
        joinedAt: '2024-01-01',
        role: 'owner',
        user: { name: 'Me' },
        createdBy: 'current-user',
        createdDate: '2024-01-01',
        modifiedBy: null,
        modifiedDate: null,
      },
    ]
    setupMocks({ members: soloMembers })

    renderPage()

    //== Household name should render but no member names paragraph
    expect(screen.getByText('Test Household')).toBeInTheDocument()
    //== The current user's member name ('Me') should not appear
    expect(screen.queryByText('Me')).not.toBeInTheDocument()
  })

  it('renders create and join actions in FAB menu', async () => {
    setupMocks()

    renderPage()

    //== FAB starts closed; open it to reveal the action menu
    await userEvent.click(screen.getByLabelText('Open actions menu'))

    expect(screen.getByText('Create Household')).toBeInTheDocument()
    expect(screen.getByText('Join with Code')).toBeInTheDocument()
  })
})
