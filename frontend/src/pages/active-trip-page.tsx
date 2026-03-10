// ABOUTME: Active trip page for shopping mode
// ABOUTME: Shows checklist of items to purchase with check/uncheck functionality

import { ArrowLeft } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useQueryClient } from '@tanstack/react-query'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useCheckTripItemMutation } from '@/apis/agdevx-cart-api/trip/check-trip-item.mutation'
import { useCompleteTripMutation } from '@/apis/agdevx-cart-api/trip/complete-trip.mutation'
import { useDeleteTripItemMutation } from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import { useUpdateTripItemMutation } from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { useSSE } from '@/hooks/use-sse'

import { ConfirmDialog } from './components/confirm-dialog'
import { TripItemRow } from './components/trip-item-row'

export const ActiveTripPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: households } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const checkMutation = useCheckTripItemMutation()
  const completeMutation = useCompleteTripMutation()
  const updateMutation = useUpdateTripItemMutation()
  const deleteMutation = useDeleteTripItemMutation()

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

  const handleUpdateItem = (tripItemId: string, quantity: number, notes: string | null, storeId: string | null) => {
    if (!tripId) return
    updateMutation.mutate({ tripItemId, tripId, quantity, notes, storeId })
  }

  const handleDeleteItem = (tripItemId: string) => {
    if (!tripId) return
    deleteMutation.mutate({ tripItemId, tripId })
  }

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  const handleCompleteTrip = async () => {
    if (!tripId) return

    const allChecked = tripItems?.every((item) => item.isChecked)

    if (!allChecked) {
      setShowCompleteConfirm(true)
      return
    }

    await doCompleteTrip()
  }

  const doCompleteTrip = async () => {
    if (!tripId) return

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
    <div className="px-5 pt-14 pb-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/shopping/${tripId}`)}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Update Shopping List
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
          {tripItems.map((item) => (
              <TripItemRow
                key={item.id}
                tripItem={item}
                itemName={item.itemName}
                stores={stores || []}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
                isUpdating={updateMutation.isPending}
                showCheckbox
                onToggleCheck={(id, checked) => handleToggleItem(id, checked)}
              />
          ))}
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

      {showCompleteConfirm && (
        <ConfirmDialog
          title="Hold on!"
          message="It looks like you may have missed some items. Are you sure you want to complete your trip?"
          confirmLabel="Complete Anyway"
          cancelLabel="Keep Shopping"
          onConfirm={() => {
            setShowCompleteConfirm(false)
            doCompleteTrip()
          }}
          onCancel={() => setShowCompleteConfirm(false)}
          isPending={completeMutation.isPending}
        />
      )}
    </div>
  )
}
