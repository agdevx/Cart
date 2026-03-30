// ABOUTME: Trip detail page for planning mode
// ABOUTME: Allows adding items to trip and starting shopping session

import { useMemo } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { ArrowLeft, ShoppingCart } from 'lucide-react'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useDeleteTripItemMutation } from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import { useStartTripMutation } from '@/apis/agdevx-cart-api/trip/start-trip.mutation'
import { useUpdateTripItemMutation } from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { activeTripPath, ROUTES, tripAddItemsPath } from '@/routes'
import { useStoreAccordionState } from '@/services/use-store-accordion-state.service'
import { EmptyState } from '@/shared/empty-state'
import { Fab } from '@/shared/fab'
import { SectionHeader } from '@/shared/section-header'
import { Spinner } from '@/shared/spinner'
import { StoreAccordion } from '@/shared/store-accordion'
import { TripItemRow } from '@/shared/trip-item-row'
import { getStoreDisplayNames } from '@/utils/get-store-display-names'
import { sortItems } from '@/utils/sort-items'

export const TripDetailPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: households } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const { isExpanded, toggleStore } = useStoreAccordionState(tripId!, 'planning', trip?.isCompleted ?? false)
  const startMutation = useStartTripMutation()
  const updateMutation = useUpdateTripItemMutation()
  const deleteMutation = useDeleteTripItemMutation()

  const storeDisplayNames = useMemo(
    () => getStoreDisplayNames(stores ?? [], households ?? []),
    [stores, households]
  )

  const groupedItems = useMemo(() => {
    if (!tripItems) return []
    const groups: Record<string, typeof tripItems> = {}
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
  }, [tripItems])

  const handleStartShopping = async () => {
    try {
      if (!trip?.isStarted) {
        await startMutation.mutateAsync(tripId!)
      }
      navigate(activeTripPath(tripId!))
    } catch {
      // Error toast shown by global MutationCache handler
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
      <div className="px-5 pt-7">
        <div className="h-9 w-40 bg-navy/8 animate-pulse rounded-lg mb-6" />
        <div className="space-y-3">
          <div className="p-4 bg-bg-warm rounded-xl">
            <div className="h-3 w-2/5 bg-navy/8 animate-pulse rounded-lg" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-4 bg-surface rounded-xl shadow-sm space-y-2">
              <div className="h-3 w-1/2 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2.5 w-1/3 bg-navy/8 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="px-5 pt-7">
        <p className="text-text-secondary">Trip not found</p>
      </div>
    )
  }

  const readOnly = trip.isCompleted ?? false

  return (
    <div className="px-5 pt-7 pb-8 animate-fade-in">
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

      {!readOnly && (
        <div className="mb-6">
          <button
            onClick={handleStartShopping}
            disabled={!tripItems || tripItems.length === 0 || startMutation.isPending}
            className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            {startMutation.isPending ? <Spinner /> : trip.isStarted ? 'Continue Shopping' : 'Start Shopping'}
          </button>
        </div>
      )}

      <div className="mb-4">
        <SectionHeader title={`Shopping List (${tripItems?.length ?? 0})`} />

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
                      storeDisplayNames={storeDisplayNames}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      isUpdating={updateMutation.isPending}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </StoreAccordion>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="No items in this trip"
            subtitle="Add some items to get started"
            actionLabel="Add Items"
            onAction={() => navigate(tripAddItemsPath(tripId!))}
          />
        )}
      </div>

      {!readOnly && (
        <Fab
          actions={[
            { label: 'Add Items', onClick: () => navigate(tripAddItemsPath(tripId!)) },
          ]}
        />
      )}
    </div>
  )
}
