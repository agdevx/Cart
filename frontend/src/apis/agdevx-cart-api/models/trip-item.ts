// ABOUTME: TripItem interface linking inventory items to specific trips with shopping details
// ABOUTME: Tracks quantity, store preference, notes, and checked status for each item

export interface TripItem {
  id: string;
  tripId: string;
  inventoryItemId: string | null;
  itemName: string;
  storeName: string | null;
  quantity: number;
  storeId: string | null;
  notes: string | null;
  isChecked: boolean;
  isHouseholdItem: boolean;
  checkedAt: string | null;
  inventoryItem?: {
    id: string;
    name: string;
    notes: string | null;
    defaultStoreId: string | null;
  } | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
