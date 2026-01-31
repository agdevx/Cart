// ABOUTME: Store interface representing either household-scoped or user-scoped stores
// ABOUTME: Household stores are shared across household, user stores are private to individual users

export interface Store {
  id: string;
  name: string;
  householdId: string | null;
  userId: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
