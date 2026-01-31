// ABOUTME: TripItem interface linking inventory items to specific trips with shopping details
// ABOUTME: Tracks quantity, store preference, notes, and checked status for each item

export interface TripItem {
  id: string;
  tripId: string;
  inventoryItemId: string;
  quantity: number;
  storeId: string | null;
  notes: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  createdBy: string | null;
  createdDate: string;
  modifiedBy: string | null;
  modifiedDate: string | null;
}
