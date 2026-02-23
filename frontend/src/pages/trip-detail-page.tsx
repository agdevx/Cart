// ABOUTME: Trip detail page for planning mode
// ABOUTME: Allows adding items to trip and starting shopping session

import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'

import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useAddTripItemMutation } from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'

export const TripDetailPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: inventory } = useInventoryQuery()
  const addItemMutation = useAddTripItemMutation()
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const handleAddItem = async () => {
    if (!selectedItemId || !tripId) return

    try {
      await addItemMutation.mutateAsync({
        tripId,
        inventoryItemId: selectedItemId,
        quantity: parseInt(quantity, 10),
      })
      setSelectedItemId('')
      setQuantity('1')
      setShowAddItem(false)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleStartShopping = () => {
    navigate(`/shopping/${tripId}/active`)
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

  const availableItems = inventory?.filter(
    (item) => !tripItems?.some((ti) => ti.inventoryItemId === item.id)
  ) || []

  return (
    <div className="bg-bg min-h-screen px-5 pt-14 pb-8">
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
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Shopping List</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="px-4 py-2 text-sm font-display font-semibold text-teal border border-teal/30 rounded-xl hover:bg-teal/8 transition-colors"
          >
            {showAddItem ? 'Cancel' : 'Add Item'}
          </button>
        </div>

        {showAddItem && (
          <div className="mb-4 p-5 bg-surface rounded-2xl shadow-sm">
            <div className="mb-3">
              <label htmlFor="item" className="block text-sm font-semibold text-navy-soft mb-1">
                Select Item
              </label>
              <select
                id="item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                disabled={addItemMutation.isPending}
              >
                <option value="">Choose an item...</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="quantity" className="block text-sm font-semibold text-navy-soft mb-1">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                disabled={addItemMutation.isPending}
              />
            </div>

            <button
              onClick={handleAddItem}
              disabled={addItemMutation.isPending || !selectedItemId}
              className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
            >
              {addItemMutation.isPending ? 'Adding...' : 'Add to List'}
            </button>
          </div>
        )}

        {tripItems && tripItems.length > 0 ? (
          <div className="space-y-2">
            {tripItems.map((item) => {
              const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
              return (
                <div
                  key={item.id}
                  className="p-4 bg-surface rounded-xl shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-navy">{inventoryItem?.name || 'Unknown Item'}</h3>
                      <p className="text-sm text-text-secondary">Quantity: {item.quantity}</p>
                      {item.notes && (
                        <p className="text-sm text-text-secondary">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
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
