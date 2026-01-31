// ABOUTME: Trip detail page for planning mode
// ABOUTME: Allows adding items to trip and starting shopping session

import { useParams, useNavigate } from 'react-router-dom'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useAddTripItemMutation } from '@/apis/agdevx-cart-api/trip/add-trip-item.mutation'
import { useState } from 'react'

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
      <div className="p-4">
        <p>Loading trip...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-4">
        <p>Trip not found</p>
      </div>
    )
  }

  const availableItems = inventory?.filter(
    (item) => !tripItems?.some((ti) => ti.inventoryItemId === item.id)
  ) || []

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate('/shopping')}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Shopping
        </button>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
      </div>

      <div className="mb-4">
        <button
          onClick={handleStartShopping}
          disabled={!tripItems || tripItems.length === 0}
          className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold"
        >
          Start Shopping
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Shopping List</h2>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showAddItem ? 'Cancel' : 'Add Item'}
          </button>
        </div>

        {showAddItem && (
          <div className="mb-4 p-4 bg-white border rounded">
            <div className="mb-3">
              <label htmlFor="item" className="block text-sm font-medium mb-1">
                Select Item
              </label>
              <select
                id="item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={addItemMutation.isPending}
              />
            </div>

            <button
              onClick={handleAddItem}
              disabled={addItemMutation.isPending || !selectedItemId}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
                  className="p-4 bg-white border rounded shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{inventoryItem?.name || 'Unknown Item'}</h3>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.notes && (
                        <p className="text-sm text-gray-600">{item.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-600">No items in this trip yet. Add some items to get started!</p>
        )}
      </div>
    </div>
  )
}
