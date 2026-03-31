import { describe, expect, it } from 'vitest'

import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'

import { getStoreDisplayNames } from './get-store-display-names'

const makeStore = (overrides: Partial<Store> & { id: string; name: string }): Store => ({
  householdId: null,
  userId: null,
  createdBy: 'system',
  createdDate: '',
  modifiedBy: null,
  modifiedDate: null,
  ...overrides,
})

const makeHousehold = (id: string, name: string): Household => ({
  id,
  name,
  owner1UserId: 'u1',
  owner2UserId: null,
  createdBy: 'system',
  createdDate: '',
  modifiedBy: 'system',
  modifiedDate: null,
})

describe('getStoreDisplayNames', () => {
  it('should return plain names when no duplicates', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', householdId: 'h1' }),
    ]
    const household = makeHousehold('h1', 'Smith Family')

    const result = getStoreDisplayNames(stores, household)

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should append scope labels when names collide across scopes', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const household = makeHousehold('h1', 'Smith Family')

    const result = getStoreDisplayNames(stores, household)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should detect duplicates case-insensitively', () => {
    const stores = [
      makeStore({ id: '1', name: 'costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const household = makeHousehold('h1', 'Smith Family')

    const result = getStoreDisplayNames(stores, household)

    expect(result.get('1')).toBe('costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should not disambiguate stores with same name in same scope', () => {
    // This shouldn't happen with uniqueness enforcement, but utility should handle it
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', userId: 'u1' }),
    ]

    const result = getStoreDisplayNames(stores, null)

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should handle empty store list', () => {
    const result = getStoreDisplayNames([], null)
    expect(result.size).toBe(0)
  })

  it('should fall back to "Household" when no household provided', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h-unknown' }),
    ]

    const result = getStoreDisplayNames(stores, null)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Household)')
  })
})
