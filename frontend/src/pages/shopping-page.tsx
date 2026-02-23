// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'

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
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading trips...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Trips</span>
        </h1>
      </div>

      {/* New Trip Button */}
      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="w-full py-4 border-2 border-dashed border-navy/14 rounded-2xl bg-transparent text-text-secondary font-display text-[15px] font-semibold hover:border-teal hover:text-teal hover:bg-teal/8 transition-all flex items-center justify-center gap-2.5 mb-2"
      >
        <Plus className="w-5 h-5" />
        {showCreateForm ? 'Cancel' : 'Plan a new trip'}
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreateTrip} className="mt-3 mb-4 p-5 bg-surface rounded-2xl shadow-sm">
          <div className="mb-3">
            <label htmlFor="tripName" className="block text-sm font-semibold text-navy-soft mb-1">
              Trip Name
            </label>
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Weekly Groceries"
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              disabled={createMutation.isPending}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="household" className="block text-sm font-semibold text-navy-soft mb-1">
              Type
            </label>
            <select
              id="household"
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
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
            className="w-full py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      )}

      {activeTrips.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">In Progress</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {activeTrips.map((trip) => (
              <Link
                key={trip.id}
                to={`/shopping/${trip.id}`}
                className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <h3 className="font-display text-lg font-bold text-navy">{trip.name}</h3>
                <p className="text-[13px] text-text-secondary font-medium mt-1">
                  Started: {new Date(trip.createdDate).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {completedTrips.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Completed</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {completedTrips.map((trip) => (
              <div
                key={trip.id}
                className="p-5 bg-surface rounded-2xl shadow-sm opacity-60"
              >
                <h3 className="font-display text-lg font-bold text-navy-soft">{trip.name}</h3>
                <p className="text-[13px] text-text-secondary font-medium mt-1">
                  Completed: {trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {trips && trips.length === 0 && (
        <p className="text-text-secondary mt-4">No trips yet. Create your first shopping trip!</p>
      )}
    </div>
  )
}
