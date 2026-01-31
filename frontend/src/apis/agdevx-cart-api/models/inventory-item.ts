// ABOUTME: InventoryItem interface representing household-shared or user-private items
// ABOUTME: Household items are visible to all household members, user items are private to owner

export interface InventoryItem {
  id: string;
  name: string;
  defaultStoreId: string | null;
  notes: string | null;
  ownerUserId: string | null;
  householdId: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
