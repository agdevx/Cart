// ABOUTME: Tests for the single-household HouseholdPage
// ABOUTME: Verifies loading, empty (create/join), and in-household states

import { MemoryRouter } from 'react-router-dom'

import type { UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as householdQueryModule from '@/apis/agdevx-cart-api/household/use-household.query'
import * as membersQueryModule from '@/apis/agdevx-cart-api/household/use-household-members.query'
import * as inviteCodeQueryModule from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import * as swapStatusQueryModule from '@/apis/agdevx-cart-api/household/use-swap-status.query'
import type { Household, HouseholdMember, SwapStatusResponse } from '@/apis/agdevx-cart-api/models/household'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import { HouseholdPage } from '../household-page'

vi.mock('@/apis/agdevx-cart-api/household/create-household.mutation', () => ({
  useCreateHouseholdMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/join-household.mutation', () => ({
  useJoinHouseholdMutation: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/leave-household.mutation', () => ({
  useLeaveHouseholdMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/delete-household.mutation', () => ({
  useDeleteHouseholdMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/update-household.mutation', () => ({
  useUpdateHouseholdMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/regenerate-invite-code.mutation', () => ({
  useRegenerateInviteCodeMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/promote-owner.mutation', () => ({
  usePromoteOwnerMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/demote-owner.mutation', () => ({
  useDemoteOwnerMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/apis/agdevx-cart-api/household/remove-household-member.mutation', () => ({
  useRemoveHouseholdMemberMutation: () => ({ mutate: vi.fn(), isPending: false }),
}))

const renderPage = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HouseholdPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockHousehold: Household = {
  id: 'h1',
  name: 'Test Household',
  owner1UserId: 'current-user',
  owner2UserId: null,
  createdBy: 'current-user',
  createdDate: '2024-01-01',
  modifiedBy: 'current-user',
  modifiedDate: null,
}

const mockMembers: HouseholdMember[] = [
  { userId: 'current-user', name: 'Me', isOwner: true },
  { userId: 'other-user', name: 'Alice', isOwner: false },
  { userId: 'third-user', name: 'Bob', isOwner: false },
]

const setupMocks = (overrides?: {
  userId?: string
  household?: Household | null
  members?: HouseholdMember[]
  householdLoading?: boolean
}) => {
  const {
    userId = 'current-user',
    household = mockHousehold,
    members = mockMembers,
    householdLoading = false,
  } = overrides ?? {}

  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: userId, email: 'test@test.com', name: 'Test User', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })

  vi.spyOn(householdQueryModule, 'useHouseholdQuery').mockReturnValue({
    data: householdLoading ? undefined : household,
    isLoading: householdLoading,
  } as UseQueryResult<Household | null>)

  vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
    data: members,
    isLoading: false,
  } as UseQueryResult<HouseholdMember[]>)

  vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
    data: 'ABC123',
    isLoading: false,
  } as UseQueryResult<string>)

  vi.spyOn(swapStatusQueryModule, 'useSwapStatusQuery').mockReturnValue({
    data: { scenario: 'none', currentHouseholdId: null, currentHouseholdName: null, coOwnerName: null },
    isLoading: false,
  } as unknown as UseQueryResult<SwapStatusResponse>)
}

describe('HouseholdPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    setupMocks({ householdLoading: true })

    const { container } = renderPage()

    //== Skeleton loader divs should be visible with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders empty state when no household', () => {
    setupMocks({ household: null })

    renderPage()

    expect(screen.getByText('No household yet')).toBeInTheDocument()
  })

  it('renders FAB with create and join actions when no household', async () => {
    setupMocks({ household: null })
    const user = userEvent.setup()

    renderPage()

    //== FAB should be visible with "Open actions menu" label (multi-action mode)
    const fab = screen.getByLabelText('Open actions menu')
    expect(fab).toBeInTheDocument()

    //== Open the FAB menu to reveal actions
    await user.click(fab)
    expect(screen.getByText('Create Household')).toBeInTheDocument()
    expect(screen.getByText('Join Household')).toBeInTheDocument()
  })

  it('shows create form when FAB create action is clicked', async () => {
    setupMocks({ household: null })
    const user = userEvent.setup()

    renderPage()

    //== Open FAB menu and click "Create Household"
    await user.click(screen.getByLabelText('Open actions menu'))
    await user.click(screen.getByText('Create Household'))

    //== Inline create form should appear with header and input
    expect(screen.getByPlaceholderText('Household name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('shows join form when FAB join action is clicked', async () => {
    setupMocks({ household: null })
    const user = userEvent.setup()

    renderPage()

    //== Open FAB menu and click "Join Household"
    await user.click(screen.getByLabelText('Open actions menu'))
    await user.click(screen.getByText('Join Household'))

    //== Inline join form should appear with invite code input
    expect(screen.getByPlaceholderText('Enter invite code')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders household name when in a household', () => {
    setupMocks()

    renderPage()

    expect(screen.getByText('Test Household')).toBeInTheDocument()
  })

  it('renders members section with member count', () => {
    setupMocks()

    renderPage()

    expect(screen.getByText('Members (3)')).toBeInTheDocument()
  })

  it('renders invite code section', () => {
    setupMocks()

    renderPage()

    expect(screen.getByText('Invite Code')).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('renders leave button inside danger zone', async () => {
    setupMocks()
    const user = userEvent.setup()

    renderPage()

    //== Danger zone starts collapsed — expand it first
    await user.click(screen.getByText('Danger Zone'))
    expect(screen.getByText('Leave Household')).toBeInTheDocument()
  })
})
