// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ChevronDown, ShoppingCart } from 'lucide-react'

import { useHouseholdQuery } from '@/apis/agdevx-cart-api/household/use-household.query'
import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useDeleteTripMutation } from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import { useReopenTripMutation } from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import { useUpdateTripMutation } from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { tripDetailPath } from '@/routes'
import { EmptyState } from '@/shared/empty-state'
import { Fab } from '@/shared/fab'
import { PageHeader } from '@/shared/page-header'
import { SectionHeader } from '@/shared/section-header'
import { SkeletonCard } from '@/shared/skeleton-card'
import { TripCard } from '@/shared/trip-card'

import { TripCreateForm } from './trip-create-form'

export const ShoppingPage = () => {
  const navigate = useNavigate()
  const { data: household } = useHouseholdQuery()
  const { data: trips, isLoading } = useTripsQuery()
  const createMutation = useCreateTripMutation()
  const updateMutation = useUpdateTripMutation()
  const deleteMutation = useDeleteTripMutation()
  const reopenMutation = useReopenTripMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  // formKey forces the form to remount when opened, resetting its internal state
  const [formKey, setFormKey] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)

  const inProgressTrips = trips?.filter((trip) => trip.isStarted && !trip.isCompleted) || []
  const planningTrips = trips?.filter((trip) => !trip.isStarted && !trip.isCompleted) || []
  const completedTrips = trips?.filter((trip) => trip.isCompleted)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) { return 0 }
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    }) || []

  const handleCreateTrip = async ({ name, tripDate, householdId }: { name: string; tripDate: string | null; householdId: string | null }) => {
    try {
      const newTrip = await createMutation.mutateAsync({ name, tripDate, householdId })
      setShowCreateForm(false)
      navigate(tripDetailPath(newTrip.id))
    } catch {
      // Error toast shown by global MutationCache handler
    }
  }

  const handleUpdate = (tripId: string, name: string, tripDate: string | null) => {
    updateMutation.mutate({ tripId, name, tripDate })
  }

  /* Long-press in TripCard is the confirmation — fire the mutation directly */
  const handleDelete = (tripId: string, _tripName: string) => {
    deleteMutation.mutate(tripId)
  }

  const handleReopen = (tripId: string) => {
    reopenMutation.mutate(tripId)
  }

  if (isLoading) {
    return (
      <div className="px-5 pt-7">
        <div className="h-9 w-48 bg-navy/8 animate-pulse rounded-lg mb-6" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} rows={[{ width: '60%' }, { width: '40%' }, { width: '100%' }]} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Your <span className="text-teal">Shopping Trips</span></PageHeader>
      <div className="px-5">
      {showCreateForm && (
        <TripCreateForm
          key={formKey}
          household={household}
          onSubmit={handleCreateTrip}
          onCancel={() => setShowCreateForm(false)}
          isPending={createMutation.isPending || createMutation.isSuccess}
        />
      )}

      {/* In Progress section */}
      {inProgressTrips.length > 0 && (
        <div className="mb-6">
          <div className="mt-6">
            <SectionHeader title="In Progress" />
          </div>
          <div className="space-y-3">
            {inProgressTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onUpdate={handleUpdate} onDelete={handleDelete} onReopen={handleReopen} />
            ))}
          </div>
        </div>
      )}

      {/* Planning section */}
      {planningTrips.length > 0 && (
        <div className="mb-6">
          <div className="mt-6">
            <SectionHeader title="Planning" />
          </div>
          <div className="space-y-3">
            {planningTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onUpdate={handleUpdate} onDelete={handleDelete} onReopen={handleReopen} />
            ))}
          </div>
        </div>
      )}

      {/* Completed section (accordion) */}
      {completedTrips.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full hover:opacity-80 transition-opacity"
          >
            <SectionHeader
              title="Completed"
              action={<ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showCompleted ? 'rotate-180' : ''}`} />}
            />
          </button>
          <div className={`grid transition-all duration-200 ${showCompleted ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="space-y-3">
                {completedTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onUpdate={handleUpdate} onDelete={handleDelete} onReopen={handleReopen} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {trips && trips.length === 0 && (
        <EmptyState
          icon={ShoppingCart}
          title="No trips yet"
          subtitle="Create your first shopping trip to get started"
          actionLabel="Create Trip"
          onAction={() => setShowCreateForm(true)}
        />
      )}

      </div>

      {/* FAB — hidden while create form is open to avoid double-entry confusion */}
      {!showCreateForm && (
        <Fab
          actions={[{
            label: 'Plan a Trip',
            onClick: () => { setFormKey((k) => k + 1); setShowCreateForm(true) },
          }]}
        />
      )}
    </div>
  )
}
