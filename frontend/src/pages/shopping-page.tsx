// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { Link } from 'react-router-dom'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useState } from 'react'

export const ShoppingPage = () => {
  const { data: trips, isLoading } = useTripsQuery()
  const { data: households } = useHouseholdsQuery()
  const createMutation = useCreateTripMutation()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tripName, setTripName] = useState('')
  const [householdId, setHouseholdId] = useState<string>('personal')

  const activeTrips = trips?.filter((trip) => !trip.isCompleted) || []
  const completedTrips = trips?.filter((trip) => trip.isCompleted) || []

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tripName.trim()) {
      return
    }

    try {
      await createMutation.mutateAsync({
        name: tripName.trim(),
        householdId: householdId === 'personal' ? null : householdId,
      })
      setTripName('')
      setShowCreateForm(false)
    } catch {
      // Error handled by mutation state
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading trips...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Shopping</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'New Trip'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateTrip} className="mb-6 p-4 bg-white border rounded">
          <div className="mb-3">
            <label htmlFor="tripName" className="block text-sm font-medium mb-1">
              Trip Name
            </label>
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="household" className="block text-sm font-medium mb-1">
              Type
            </label>
            <select
              id="household"
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={createMutation.isPending}
            >
              <option value="personal">Personal Trip</option>
              {households?.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !tripName.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      )}

      {activeTrips.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Active Trips</h2>
          <div className="space-y-2">
            {activeTrips.map((trip) => (
              <Link
                key={trip.id}
                to={`/shopping/${trip.id}`}
                className="block p-4 bg-white border rounded shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold">{trip.name}</h3>
                <p className="text-sm text-gray-600">
                  Started: {new Date(trip.createdDate).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {completedTrips.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Trip History</h2>
          <div className="space-y-2">
            {completedTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 bg-gray-50 border rounded shadow-sm"
              >
                <h3 className="font-semibold text-gray-700">{trip.name}</h3>
                <p className="text-sm text-gray-600">
                  Completed: {trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {trips && trips.length === 0 && (
        <p className="text-gray-600">No trips yet. Create your first shopping trip!</p>
      )}
    </div>
  )
}
