// ABOUTME: Household and HouseholdMember interfaces for shared shopping groups
// ABOUTME: Contains household details and member relationships with roles

export interface Household {
  id: string;
  name: string | null;
  inviteCode?: string;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  joinedAt: string;
  role: string;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
