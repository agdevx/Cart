// ABOUTME: TanStack Query mutation hook for bulk importing inventory items from CSV
// ABOUTME: Sends parsed CSV rows to POST /api/v1/inventory/import, invalidates inventory and store caches

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from '../agdevx-cart-api-config'

interface ImportInventoryItemRequest {
  name: string
  notes: string | null
  defaultStore: string | null
  scope: string
}

export interface ImportInventoryResult {
  personalItemsImported: number
  householdItemsImported: number
  duplicatesSkipped: number
  householdItemsSkipped: number
  invalidRowsSkipped: number
}

export const useImportInventoryMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['inventory', 'import'],
    mutationFn: async (items: ImportInventoryItemRequest[]): Promise<ImportInventoryResult> => {
      const response = await apiFetch('/api/v1/inventory/import', {
        method: 'POST',
        body: JSON.stringify(items),
      })
      return response.json() as Promise<ImportInventoryResult>
    },
    meta: { handlesErrors: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
