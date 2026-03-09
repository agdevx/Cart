// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useHouseholdsQuery } from '@/apis/agdevx-cart-api/household/use-households.query'
import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useDeleteTripMutation } from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import { useReopenTripMutation } from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import { useUpdateTripMutation } from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'

import { ConfirmDialog } from './components/confirm-dialog'
import { ScopeSelect } from './components/scope-select'
import { TripCard } from './components/trip-card'

export const ShoppingPage = () => {
  const navigate = useNavigate()
  const { data: trips, isLoading } = useTripsQuery()
  const { data: households } = useHouseholdsQuery()
  const createMutation = useCreateTripMutation()
  const updateMutation = useUpdateTripMutation()
  const deleteMutation = useDeleteTripMutation()
  const reopenMutation = useReopenTripMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tripName, setTripName] = useState('')
  const [householdId, setHouseholdId] = useState<string>('personal')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const inProgressTrips = trips?.filter((trip) => trip.isStarted && !trip.isCompleted) || []
  const planningTrips = trips?.filter((trip) => !trip.isStarted && !trip.isCompleted) || []
  const completedTrips = trips?.filter((trip) => trip.isCompleted) || []

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tripName.trim()) {
      return
    }

    try {
      const newTrip = await createMutation.mutateAsync({
        name: tripName.trim(),
        householdId: householdId === 'personal' ? null : householdId,
      })
      setTripName('')
      setShowCreateForm(false)
      navigate(`/shopping/${newTrip.id}`)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleRename = (tripId: string, newName: string) => {
    updateMutation.mutate({ tripId, name: newName })
  }

  const handleDelete = (tripId: string, tripName: string) => {
    setDeleteConfirm({ id: tripId, name: tripName })
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id)
      setDeleteConfirm(null)
    }
  }

  const handleReopen = (tripId: string) => {
    reopenMutation.mutate(tripId)
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
            <ScopeSelect
              value={householdId}
              onChange={setHouseholdId}
              personalLabel="Personal Trip"
              households={households}
              householdDescription="Household"
              disabled={createMutation.isPending}
              aria-label="Type"
            />
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

      {/* In Progress section */}
      {inProgressTrips.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">In Progress</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {inProgressTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
            ))}
          </div>
        </div>
      )}

      {/* Planning section */}
      {planningTrips.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mt-6 mb-3">
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Planning</span>
            <span className="flex-1 h-px bg-navy/8" />
          </div>
          <div className="space-y-3">
            {planningTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
            ))}
          </div>
        </div>
      )}

      {/* Completed section (accordion) */}
      {completedTrips.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2.5 w-full mb-3"
          >
            <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">
              Completed ({completedTrips.length})
            </span>
            <span className="flex-1 h-px bg-navy/8" />
            <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
          </button>
          {showCompleted && (
            <div className="space-y-3">
              {completedTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onRename={handleRename} onDelete={handleDelete} onReopen={handleReopen} />
              ))}
            </div>
          )}
        </div>
      )}

      {trips && trips.length === 0 && (
        <p className="text-text-secondary mt-4">No trips yet. Create your first shopping trip!</p>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete "${deleteConfirm.name}"? This can't be undone.`}
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
