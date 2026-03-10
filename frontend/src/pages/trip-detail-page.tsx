// ABOUTME: Trip detail page for planning mode
// ABOUTME: Allows adding items to trip and starting shopping session

import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useStartTripMutation } from '@/apis/agdevx-cart-api/trip/start-trip.mutation'
import { useDeleteTripItemMutation } from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import { useUpdateTripItemMutation } from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'

import { useStoreAccordionState } from '@/hooks/use-store-accordion-state'

import { activeTripPath, ROUTES, tripAddItemsPath } from '@/routes'

import { StoreAccordion } from './components/store-accordion'
import { TripItemRow } from './components/trip-item-row'

export const TripDetailPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: households } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const { isExpanded, toggleStore } = useStoreAccordionState(tripId!, trip?.isCompleted ?? false)
  const startMutation = useStartTripMutation()
  const updateMutation = useUpdateTripItemMutation()
  const deleteMutation = useDeleteTripItemMutation()

  const groupedItems = useMemo(() => {
    if (!tripItems) return []
    const groups: Record<string, typeof tripItems> = {}
    tripItems.forEach((item) => {
      const key = item.storeName ?? 'Any Store'
      ;(groups[key] ??= []).push(item)
    })
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Any Store') return 1
      if (b === 'Any Store') return -1
      return a.localeCompare(b)
    })
  }, [tripItems])

  const handleStartShopping = async () => {
    try {
      if (!trip?.isStarted) {
        await startMutation.mutateAsync(tripId!)
      }
      navigate(activeTripPath(tripId!))
    } catch {
      // Error handled by mutation state
    }
  }

  const handleUpdateItem = (tripItemId: string, quantity: number, notes: string | null, storeId: string | null) => {
    updateMutation.mutate({ tripItemId, tripId: tripId!, quantity, notes, storeId })
  }

  const handleDeleteItem = (tripItemId: string) => {
    deleteMutation.mutate({ tripItemId, tripId: tripId! })
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

  return (
    <div className="px-5 pt-14 pb-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(ROUTES.SHOPPING)}
          className="text-teal hover:text-teal-light font-semibold text-sm flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trips
        </button>
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">{trip.name}</h1>
      </div>

      <div className="mb-6">
        <button
          onClick={handleStartShopping}
          disabled={!tripItems || tripItems.length === 0 || startMutation.isPending}
          className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          {startMutation.isPending ? 'Starting...' : trip.isStarted ? 'Continue Shopping' : 'Start Shopping'}
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Shopping List</span>
          <span className="flex-1 h-px bg-navy/8" />
        </div>

        <button
          onClick={() => navigate(tripAddItemsPath(tripId!))}
          className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
        >
          <Plus className="w-5 h-5" />
          Add Items
        </button>

        {groupedItems.length > 0 ? (
          <div>
            {groupedItems.map(([storeName, storeItems]) => (
              <StoreAccordion
                key={storeName}
                storeName={storeName}
                isExpanded={isExpanded(storeName)}
                onToggle={() => toggleStore(storeName)}
                itemCount={storeItems.length}
              >
                <div className="space-y-2">
                  {storeItems.map((item) => (
                    <TripItemRow
                      key={item.id}
                      tripItem={item}
                      itemName={item.itemName}
                      stores={stores || []}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      isUpdating={updateMutation.isPending}
                    />
                  ))}
                </div>
              </StoreAccordion>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary">No items in this trip yet. Add some items to get started!</p>
        )}
      </div>
    </div>
  )
}
