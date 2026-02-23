// ABOUTME: Active trip page for shopping mode
// ABOUTME: Shows checklist of items to purchase with check/uncheck functionality

import { ArrowLeft, Check } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useQueryClient } from '@tanstack/react-query'

import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useCheckTripItemMutation } from '@/apis/agdevx-cart-api/trip/check-trip-item.mutation'
import { useCompleteTripMutation } from '@/apis/agdevx-cart-api/trip/complete-trip.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { useSSE } from '@/hooks/use-sse'

export const ActiveTripPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: inventory } = useInventoryQuery()
  const checkMutation = useCheckTripItemMutation()
  const completeMutation = useCompleteTripMutation()

  const handleSSEMessage = useCallback((_data: unknown) => {
    // Invalidate trip items query to refetch with latest data
    queryClient.invalidateQueries({ queryKey: ['trips', tripId, 'items'] })
  }, [queryClient, tripId])

  // Connect to SSE for real-time updates
  useSSE(
    `/api/trips/${tripId}/events`,
    handleSSEMessage,
    !!tripId
  )

  const handleToggleItem = async (tripItemId: string, currentlyChecked: boolean) => {
    if (!tripId) return

    try {
      await checkMutation.mutateAsync({
        tripId,
        tripItemId,
        isChecked: !currentlyChecked,
      })
    } catch {
      // Error handled by mutation state
    }
  }

  const handleCompleteTrip = async () => {
    if (!tripId) return

    const allChecked = tripItems?.every((item) => item.isChecked)

    if (!allChecked) {
      const confirmComplete = confirm('Not all items are checked. Are you sure you want to complete this trip?')
      if (!confirmComplete) return
    }

    try {
      await completeMutation.mutateAsync(tripId)
      navigate('/shopping')
    } catch {
      // Error handled by mutation state
    }
  }

  if (tripLoading || itemsLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading trip...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Trip not found</p>
      </div>
    )
  }

  const checkedCount = tripItems?.filter((item) => item.isChecked).length || 0
  const totalCount = tripItems?.length || 0
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/shopping/${tripId}`)}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Planning
        </button>
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">{trip.name}</h1>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-tertiary font-semibold">{checkedCount} of {totalCount} items</span>
            <span className="text-teal font-extrabold">{progressPercent}%</span>
          </div>
          <div className="w-full bg-bg-warm rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal to-teal-light h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {tripItems && tripItems.length > 0 ? (
        <div className="space-y-2 mb-6">
          {tripItems.map((item) => {
            const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl shadow-sm cursor-pointer transition-all min-h-[60px] select-none active:scale-[0.98] ${
                  item.isChecked
                    ? 'bg-teal/8 shadow-none'
                    : 'bg-surface'
                }`}
                onClick={() => handleToggleItem(item.id, item.isChecked)}
              >
                {/* Custom checkbox */}
                <div
                  className={`w-7 h-7 rounded-[10px] flex-shrink-0 flex items-center justify-center transition-all ${
                    item.isChecked
                      ? 'bg-teal border-2 border-teal'
                      : 'border-[2.5px] border-navy/14 bg-transparent'
                  }`}
                >
                  {item.isChecked && (
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-base font-bold ${
                      item.isChecked ? 'line-through text-text-tertiary' : 'text-navy'
                    }`}
                  >
                    {inventoryItem?.name || 'Unknown Item'}
                  </h3>
                  <p className="text-xs text-text-tertiary font-semibold mt-0.5">Qty: {item.quantity}</p>
                  {item.notes && (
                    <p className="text-xs text-text-tertiary mt-0.5">{item.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-text-secondary mb-6">No items in this trip.</p>
      )}

      <button
        onClick={handleCompleteTrip}
        disabled={completeMutation.isPending}
        className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors shadow-[0_3px_0_#148F72] active:translate-y-[3px] active:shadow-none"
      >
        {completeMutation.isPending ? 'Completing...' : 'Complete Trip'}
      </button>
    </div>
  )
}
