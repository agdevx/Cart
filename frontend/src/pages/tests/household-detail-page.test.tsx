import { MemoryRouter, Route, Routes } from 'react-router-dom'

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as deleteHouseholdModule from '@/apis/agdevx-cart-api/household/delete-household.mutation'
import * as regenerateInviteCodeModule from '@/apis/agdevx-cart-api/household/regenerate-invite-code.mutation'
import * as removeHouseholdMemberModule from '@/apis/agdevx-cart-api/household/remove-household-member.mutation'
import * as transferHouseholdOwnershipModule from '@/apis/agdevx-cart-api/household/transfer-household-ownership.mutation'
import * as updateHouseholdModule from '@/apis/agdevx-cart-api/household/update-household.mutation'
import * as householdQueryModule from '@/apis/agdevx-cart-api/household/use-household.query'
import * as membersQueryModule from '@/apis/agdevx-cart-api/household/use-household-members.query'
import * as inviteCodeQueryModule from '@/apis/agdevx-cart-api/household/use-invite-code.query'
import type { Household, HouseholdMember } from '@/apis/agdevx-cart-api/models/household'
import { queryClient } from '@/apis/tanstack-query/query-client'
import * as useAuthModule from '@/auth/use-auth'

import { HouseholdDetailPage } from '../household-detail-page'

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

const mockHousehold: Household = {
  id: 'h1',
  name: 'Test Household',
  createdBy: 'owner-id',
  createdDate: '2024-01-01',
  modifiedBy: null,
  modifiedDate: null,
}

const updateMutateFn = vi.fn()
const deleteMutateFn = vi.fn()

const setupMocks = (overrides?: {
  userId?: string
  members?: HouseholdMember[]
  household?: Household | undefined
  householdLoading?: boolean
  membersLoading?: boolean
  codeLoading?: boolean
  inviteCode?: string
}) => {
  const {
    userId = 'owner-id',
    members = mockMembers,
    household = mockHousehold,
    householdLoading = false,
    membersLoading = false,
    codeLoading = false,
    inviteCode = 'ABC123',
  } = overrides ?? {}

  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    isAuthenticated: true,
    user: { id: userId, email: 'test@test.com', name: 'Test', createdBy: null, createdDate: '', modifiedBy: null, modifiedDate: null },
    setAuth: vi.fn(),
    logout: vi.fn(),
  })

  vi.spyOn(membersQueryModule, 'useHouseholdMembersQuery').mockReturnValue({
    data: members,
    isLoading: membersLoading,
  } as UseQueryResult<HouseholdMember[]>)

  vi.spyOn(inviteCodeQueryModule, 'useInviteCodeQuery').mockReturnValue({
    data: inviteCode,
    isLoading: codeLoading,
  } as UseQueryResult<string>)

  vi.spyOn(householdQueryModule, 'useHouseholdQuery').mockReturnValue({
    data: household,
    isLoading: householdLoading,
  } as UseQueryResult<Household>)

  vi.spyOn(updateHouseholdModule, 'useUpdateHouseholdMutation').mockReturnValue({
    mutate: updateMutateFn,
    isPending: false,
  } as unknown as UseMutationResult<void, Error, { householdId: string; name: string }>)

  vi.spyOn(deleteHouseholdModule, 'useDeleteHouseholdMutation').mockReturnValue({
    mutate: deleteMutateFn,
    isPending: false,
  } as unknown as UseMutationResult<void, Error, string>)

  vi.spyOn(regenerateInviteCodeModule, 'useRegenerateInviteCodeMutation').mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<string, Error, string>)

  vi.spyOn(removeHouseholdMemberModule, 'useRemoveHouseholdMemberMutation').mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, { householdId: string; userId: string }>)

  vi.spyOn(transferHouseholdOwnershipModule, 'useTransferHouseholdOwnershipMutation').mockReturnValue({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  } as unknown as UseMutationResult<void, Error, { householdId: string; userId: string }>)
}

describe('HouseholdDetailPage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    setupMocks({ membersLoading: true, codeLoading: true, householdLoading: true })

    renderWithRouter('h1')

    expect(screen.getByText('Loading household...')).toBeInTheDocument()
  })

  it('renders member list with roles', () => {
    setupMocks()

    renderWithRouter('h1')

    expect(screen.getByText('Members (2)')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })

  it('displays invite code', () => {
    setupMocks()

    renderWithRouter('h1')

    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('Copy')).toBeInTheDocument()
  })

  it('shows owner controls when user is owner', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Owner sees regenerate button
    expect(screen.getByText('Regenerate')).toBeInTheDocument()
    //== Owner sees remove and transfer buttons for other members
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('shows leave button for non-owner member', () => {
    setupMocks({ userId: 'member-id' })

    renderWithRouter('h1')

    expect(screen.getByText('Leave')).toBeInTheDocument()
    //== Non-owner should NOT see Remove or Transfer buttons
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
    expect(screen.queryByText('Transfer')).not.toBeInTheDocument()
    //== Non-owner should NOT see Regenerate button
    expect(screen.queryByText('Regenerate')).not.toBeInTheDocument()
  })

  it('displays the household name in the header', () => {
    setupMocks()

    renderWithRouter('h1')

    expect(screen.getByText('Test Household')).toBeInTheDocument()
    expect(screen.queryByText('Household Details')).not.toBeInTheDocument()
  })

  it('renames household via inline edit', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Click the pencil icon to enter rename mode
    fireEvent.click(screen.getByLabelText('Rename household'))

    //== Input should appear pre-filled with current name
    const input = screen.getByDisplayValue('Test Household')
    expect(input).toBeInTheDocument()

    //== Change value and press Enter
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(updateMutateFn).toHaveBeenCalledWith(
      { householdId: 'h1', name: 'New Name' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('cancels rename on Escape', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Enter rename mode
    fireEvent.click(screen.getByLabelText('Rename household'))

    const input = screen.getByDisplayValue('Test Household')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    //== Mutation should NOT have been called
    expect(updateMutateFn).not.toHaveBeenCalled()
    //== Should exit rename mode and show the original name
    expect(screen.getByText('Test Household')).toBeInTheDocument()
  })

  it('shows danger zone collapsed by default (delete button hidden)', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Danger Zone heading is visible as the accordion trigger
    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
    //== Delete button is in the DOM but hidden via grid-rows-[0fr] overflow-hidden
    expect(screen.getByText('Delete Household')).toBeInTheDocument()
  })

  it('expands danger zone on click to reveal delete button', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Click the Danger Zone accordion trigger
    fireEvent.click(screen.getByText('Danger Zone'))

    //== Delete button should now be accessible
    expect(screen.getByText('Delete Household')).toBeInTheDocument()
  })

  it('hides delete button for non-owner', () => {
    setupMocks({ userId: 'member-id' })

    renderWithRouter('h1')

    expect(screen.queryByText('Delete Household')).not.toBeInTheDocument()
  })

  it('shows delete confirmation with cascade warning about items and stores', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Expand danger zone, then click delete
    fireEvent.click(screen.getByText('Danger Zone'))
    fireEvent.click(screen.getByText('Delete Household'))

    //== Warning text appears both in danger zone and in the modal
    const itemsWarnings = screen.getAllByText(/items and stores/)
    expect(itemsWarnings.length).toBeGreaterThanOrEqual(1)
    //== At least one should be inside the modal (fixed overlay)
    expect(itemsWarnings.some((el) => el.closest('.fixed'))).toBe(true)
    const undoneWarnings = screen.getAllByText(/can't be undone/)
    expect(undoneWarnings.length).toBeGreaterThanOrEqual(1)
  })

  it('should show warning text above Delete Household button in danger zone', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Expand danger zone
    fireEvent.click(screen.getByText('Danger Zone'))

    //== Warning text should be visible above delete button
    const warningText = screen.getByText(/permanently delete.*can't be undone/)
    expect(warningText).toBeInTheDocument()
    //== Verify it's in the danger zone section (not the modal)
    expect(warningText.closest('.fixed')).toBeNull()
  })

  it('should show updated modal title "Delete Household - Are you sure?"', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Expand danger zone and open delete confirmation
    fireEvent.click(screen.getByText('Danger Zone'))
    fireEvent.click(screen.getByText('Delete Household'))

    //== Modal title should include "Are you sure?"
    expect(screen.getByText('Delete Household - Are you sure?')).toBeInTheDocument()
  })

  it('deletes household on confirm', () => {
    setupMocks()

    renderWithRouter('h1')

    //== Expand danger zone and open delete confirmation
    fireEvent.click(screen.getByText('Danger Zone'))
    fireEvent.click(screen.getByText('Delete Household'))

    //== Click Delete in the dialog (the confirm button inside ConfirmDialog)
    const deleteButtons = screen.getAllByText('Delete')
    //== The dialog confirm button is the one inside ConfirmDialog
    const confirmButton = deleteButtons.find((btn) => btn.closest('.fixed'))
    fireEvent.click(confirmButton!)

    expect(deleteMutateFn).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
})
