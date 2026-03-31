// ABOUTME: Household, HouseholdMember, and SwapStatusResponse interfaces for single-household model
// ABOUTME: Contains household details, member roles, and swap-status scenarios

export interface Household {
  id: string
  name: string
  inviteCode?: string
  owner1UserId: string
  owner2UserId: string | null
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string | null
}

export interface HouseholdMember {
  userId: string
  name: string | null
  isOwner: boolean
}

export interface SwapStatusResponse {
  scenario: 'none' | 'regular-member' | 'has-co-owner' | 'sole-member' | 'ownership-transfer-required'
  currentHouseholdId: string | null
  currentHouseholdName: string | null
  coOwnerName: string | null
}
