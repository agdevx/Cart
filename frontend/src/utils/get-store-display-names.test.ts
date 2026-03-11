import { describe, expect, it } from 'vitest'

import type { Household } from '@/apis/agdevx-cart-api/models/household'
import type { Store } from '@/apis/agdevx-cart-api/models/store'

import { getStoreDisplayNames } from './get-store-display-names'

const makeStore = (overrides: Partial<Store> & { id: string; name: string }): Store => ({
  householdId: null,
  userId: null,
  createdBy: null,
  createdDate: '',
  modifiedBy: null,
  modifiedDate: null,
  ...overrides,
})

const makeHousehold = (id: string, name: string): Household => ({
  id,
  name,
  createdBy: null,
  createdDate: '',
  modifiedBy: null,
  modifiedDate: null,
})

describe('getStoreDisplayNames', () => {
  it('should return plain names when no duplicates', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should append scope labels when names collide across scopes', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should detect duplicates case-insensitively', () => {
    const stores = [
      makeStore({ id: '1', name: 'costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
    ]
    const households = [makeHousehold('h1', 'Smith Family')]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
  })

  it('should disambiguate stores from different households', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', householdId: 'h1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h2' }),
    ]
    const households = [
      makeHousehold('h1', 'Smith Family'),
      makeHousehold('h2', 'Jones Family'),
    ]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Smith Family)')
    expect(result.get('2')).toBe('Costco (Jones Family)')
  })

  it('should not disambiguate stores with same name in same scope', () => {
    // This shouldn't happen with uniqueness enforcement, but utility should handle it
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Target', userId: 'u1' }),
    ]

    const result = getStoreDisplayNames(stores, [])

    expect(result.get('1')).toBe('Costco')
    expect(result.get('2')).toBe('Target')
  })

  it('should handle empty store list', () => {
    const result = getStoreDisplayNames([], [])
    expect(result.size).toBe(0)
  })

  it('should fall back to "Household" when household not found in list', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h-unknown' }),
    ]

    const result = getStoreDisplayNames(stores, [])

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Household)')
  })

  it('should handle three-way collision (personal + two households)', () => {
    const stores = [
      makeStore({ id: '1', name: 'Costco', userId: 'u1' }),
      makeStore({ id: '2', name: 'Costco', householdId: 'h1' }),
      makeStore({ id: '3', name: 'Costco', householdId: 'h2' }),
    ]
    const households = [
      makeHousehold('h1', 'Smith Family'),
      makeHousehold('h2', 'Jones Family'),
    ]

    const result = getStoreDisplayNames(stores, households)

    expect(result.get('1')).toBe('Costco (Personal)')
    expect(result.get('2')).toBe('Costco (Smith Family)')
    expect(result.get('3')).toBe('Costco (Jones Family)')
  })
})
