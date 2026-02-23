import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/apis/tanstack-query/query-client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HouseholdDetailPage } from '../household-detail-page'
import * as useAuthModule from '@/auth/use-auth'
import * as membersQueryModule from '@/apis/agdevx-cart-api/household/use-household-members.query'
import * as inviteCodeQueryModule from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import type { HouseholdMember } from '@/apis/agdevx-cart-api/models/household'
import type { UseQueryResult } from '@tanstack/react-query'

const renderWithRouter = (householdId: string) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/household/${householdId}`]}>
        <Routes>
          <Route path="/household/:id" element={<HouseholdDetailPage />} />
          <Route path="/household" element={<div>Household List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockMembers: HouseholdMember[] = [
  {
    id: '1',
    householdId: 'h1',
    userId: 'owner-id',
    joinedAt: '2024-01-01',
    role: 'owner',
    createdBy: 'owner-id',
    createdDate: '2024-01-01',
    modifiedBy: null,
    modifiedDate: null,
  },
  {
    id: '2',
    householdId: 'h1',
    userId: 'member-id',
    joinedAt: '2024-01-15',
    role: 'member',
    createdBy: 'member-id',
    createdDate: '2024-01-15',
    modifiedBy: null,
    modifiedDate: null,
  },
]

describe('HouseholdDetailPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-id', email: 'test@test.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<HouseholdMember[]>)

    vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
    } as UseQueryResult<string>)

    renderWithRouter('h1')

    expect(screen.getByText('Loading household...')).toBeInTheDocument()
  })

  it('renders member list with roles', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-id', email: 'test@test.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
      data: mockMembers,
      isLoading: false,
    } as UseQueryResult<HouseholdMember[]>)

    vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
      data: 'ABC123',
      isLoading: false,
    } as UseQueryResult<string>)

    renderWithRouter('h1')

    expect(screen.getByText('Members (2)')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('displays invite code', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-id', email: 'test@test.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
      data: mockMembers,
      isLoading: false,
    } as UseQueryResult<HouseholdMember[]>)

    vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
      data: 'ABC123',
      isLoading: false,
    } as UseQueryResult<string>)

    renderWithRouter('h1')

    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('shows owner controls when user is owner', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'owner-id', email: 'test@test.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
      data: mockMembers,
      isLoading: false,
    } as UseQueryResult<HouseholdMember[]>)

    vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
      data: 'ABC123',
      isLoading: false,
    } as UseQueryResult<string>)

    renderWithRouter('h1')

    //== Owner sees regenerate button
    expect(screen.getByText('Regenerate')).toBeInTheDocument()
    //== Owner sees remove and transfer buttons for other members
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(screen.getByText('Transfer Ownership')).toBeInTheDocument()
  })

  it('shows leave button for non-owner member', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      user: { id: 'member-id', email: 'test@test.com', displayName: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
      setAuth: vi.fn(),
      logout: vi.fn(),
    })

    vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
      data: mockMembers,
      isLoading: false,
    } as UseQueryResult<HouseholdMember[]>)

    vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
      data: 'ABC123',
      isLoading: false,
    } as UseQueryResult<string>)

    renderWithRouter('h1')

    expect(screen.getByText('Leave Household')).toBeInTheDocument()
    //== Non-owner should NOT see Remove or Transfer Ownership buttons
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    expect(screen.queryByText('Transfer Ownership')).not.toBeInTheDocument()
    //== Non-owner should NOT see Regenerate button
    expect(screen.queryByText('Regenerate')).not.toBeInTheDocument()
  })
})
