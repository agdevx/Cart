// ABOUTME: Trip detail page for planning mode
// ABOUTME: Allows adding items to trip and starting shopping session

import { ArrowLeft, Plus, ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useStoresQuery } from '@/apis/agdevx-cart-api/store/use-stores.query'
import { useDeleteTripItemMutation } from '@/apis/agdevx-cart-api/trip/delete-trip-item.mutation'
import { useUpdateTripItemMutation } from '@/apis/agdevx-cart-api/trip/update-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'

import { TripItemRow } from './components/trip-item-row'

export const TripDetailPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: inventory } = useInventoryQuery()
  const { data: households } = useHouseholdsQuery()
  const householdIds = useMemo(() => households?.map((h) => h.id) || [], [households])
  const { data: stores } = useStoresQuery(householdIds)
  const updateMutation = useUpdateTripItemMutation()
  const deleteMutation = useDeleteTripItemMutation()

  const handleStartShopping = () => {
    navigate(`/shopping/${tripId}/active`)
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
          onClick={() => navigate('/shopping')}
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
          disabled={!tripItems || tripItems.length === 0}
          className="w-full py-4 bg-teal text-white rounded-2xl font-display font-bold text-base hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Start Shopping
        </button>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Shopping List</span>
          <span className="flex-1 h-px bg-navy/8" />
        </div>

        <button
          onClick={() => navigate(`/shopping/${tripId}/add-items`)}
          className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-4"
        >
          <Plus className="w-5 h-5" />
          Add Items
        </button>

        {tripItems && tripItems.length > 0 ? (
          <div className="space-y-2">
            {tripItems.map((item) => {
              const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
              return (
                <TripItemRow
                  key={item.id}
                  tripItem={item}
                  itemName={inventoryItem?.name || 'Unknown Item'}
                  stores={stores || []}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  isUpdating={updateMutation.isPending}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-text-secondary">No items in this trip yet. Add some items to get started!</p>
        )}
      </div>
    </div>
  )
}
