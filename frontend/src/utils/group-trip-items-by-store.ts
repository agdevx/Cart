// ABOUTME: Utility to group trip items by store name for display in accordions
// ABOUTME: Sorts items alphabetically within each group and groups alphabetically, with "Any Store" last

import type { TripItem } from '@/apis/agdevx-cart-api/models/trip-item'

import { sortItems } from './sort-items'

/** Groups trip items by storeName, sorts items within each group alphabetically,
 *  and sorts groups alphabetically with "Any Store" pinned to the end. */
export const groupTripItemsByStore = (tripItems: TripItem[]): readonly (readonly [string, readonly TripItem[]])[] => {
  const groups: Record<string, TripItem[]> = {}

  tripItems.forEach((item) => {
    const key = item.storeName ?? 'Any Store'
    ;(groups[key] ??= []).push(item)
  })

  return Object.entries(groups)
    .map(([storeName, storeItems]) => [storeName, sortItems(storeItems, 'itemName')] as const)
    .sort(([a], [b]) => {
      if (a === 'Any Store') return 1
      if (b === 'Any Store') return -1
      return a.localeCompare(b)
    })
}
