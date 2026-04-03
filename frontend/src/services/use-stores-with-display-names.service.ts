// ABOUTME: Composite hook combining household, stores, and display name logic
// ABOUTME: Eliminates boilerplate repeated across pantry and shopping pages

import { useMemo } from 'react'

import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { getStoreDisplayNames } from '@/utils/get-store-display-names'

export const useStoresWithDisplayNamesService = () => {
  const { data: household, isLoading: householdLoading } = useHouseholdQuery()
  const { data: stores, isLoading: storesLoading, isFetching: storesFetching } = useStoresQuery(household?.id ?? null)

  const storeDisplayNames = useMemo(
    () => getStoreDisplayNames(stores ?? [], household ?? null),
    [stores, household]
  )

  return {
    household,
    stores,
    storeDisplayNames,
    isLoading: householdLoading || storesLoading || storesFetching,
  }
}
