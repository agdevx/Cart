// ABOUTME: Active trip page for shopping mode
// ABOUTME: Shows checklist of items to purchase with check/uncheck functionality

import { useParams, useNavigate } from 'react-router-dom'
import { useTripQuery } from '@/apis/agdevx-cart-api/trip/use-trip.query'
import { useTripItemsQuery } from '@/apis/agdevx-cart-api/trip/use-trip-items.query'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useCheckTripItemMutation } from '@/apis/agdevx-cart-api/trip/check-trip-item.mutation'
import { useCompleteTripMutation } from '@/apis/agdevx-cart-api/trip/complete-trip.mutation'

export const ActiveTripPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { data: trip, isLoading: tripLoading } = useTripQuery(tripId!)
  const { data: tripItems, isLoading: itemsLoading } = useTripItemsQuery(tripId!)
  const { data: inventory } = useInventoryQuery()
  const checkMutation = useCheckTripItemMutation()
  const completeMutation = useCompleteTripMutation()

  const handleToggleItem = async (tripItemId: string, currentlyChecked: boolean) => {
    if (!tripId) return

    try {
      await checkMutation.mutateAsync({
        tripId,
        tripItemId,
        isChecked: !currentlyChecked,
      })
    } catch (error) {
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
    } catch (error) {
      // Error handled by mutation state
    }
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

  const checkedCount = tripItems?.filter((item) => item.isChecked).length || 0
  const totalCount = tripItems?.length || 0
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <div className="p-4">
      <div className="mb-4">
        <button
          onClick={() => navigate(`/shopping/${tripId}`)}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← Back to Planning
        </button>
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <div className="mt-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{checkedCount} of {totalCount} items</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {tripItems && tripItems.length > 0 ? (
        <div className="space-y-2 mb-4">
          {tripItems.map((item) => {
            const inventoryItem = inventory?.find((i) => i.id === item.inventoryItemId)
            return (
              <div
                key={item.id}
                className={`p-4 border rounded shadow-sm cursor-pointer transition-colors ${
                  item.isChecked
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-300'
                }`}
                onClick={() => handleToggleItem(item.id, item.isChecked)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={() => {}}
                    className="h-5 w-5 text-green-600 rounded mr-3"
                  />
                  <div className="flex-1">
                    <h3
                      className={`font-semibold ${
                        item.isChecked ? 'line-through text-gray-500' : ''
                      }`}
                    >
                      {inventoryItem?.name || 'Unknown Item'}
                    </h3>
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
        <p className="text-gray-600 mb-4">No items in this trip.</p>
      )}

      <button
        onClick={handleCompleteTrip}
        disabled={completeMutation.isPending}
        className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
      >
        {completeMutation.isPending ? 'Completing...' : 'Complete Trip'}
      </button>
    </div>
  )
}
