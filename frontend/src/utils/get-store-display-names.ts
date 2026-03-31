// ABOUTME: Computes display names for stores, appending scope labels when names collide across scopes
// ABOUTME: Returns a Map from store ID to display name — "(Personal)" or "(Household Name)" suffix on collision

import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'

export function getStoreDisplayNames(
  stores: Store[],
  household: Household | null
): Map<string, string> {
  const displayNames = new Map<string, string>()

  //== Group stores by lowercase name to detect cross-scope collisions
  const byName = new Map<string, Store[]>()
  for (const store of stores) {
    const key = store.name.toLowerCase()
    const group = byName.get(key) ?? []
    group.push(store)
    byName.set(key, group)
  }

  const householdName = household?.name ?? 'Household'

  for (const [, group] of byName) {
    //== A collision requires 2+ stores with the same name in DIFFERENT scopes
    const hasMultipleScopes = group.length > 1 && hasCrossScopeDuplicates(group)

    for (const store of group) {
      if (hasMultipleScopes) {
        const label = store.householdId ? householdName : 'Personal'
        displayNames.set(store.id, `${store.name} (${label})`)
      } else {
        displayNames.set(store.id, store.name)
      }
    }
  }

  return displayNames
}

//== Check if stores in a group span different scopes
function hasCrossScopeDuplicates(group: Store[]): boolean {
  const scopes = new Set(group.map((s) => s.householdId ?? `personal:${s.userId}`))
  return scopes.size > 1
}
