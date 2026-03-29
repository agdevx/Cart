// ABOUTME: Shopping page displaying active trip and trip history
// ABOUTME: Shows current trip in progress and completed trips list

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ChevronDown, ShoppingCart } from 'lucide-react'

import { useCreateTripMutation } from '@/apis/agdevx-cart-api/trip/create-trip.mutation'
import { useDeleteTripMutation } from '@/apis/agdevx-cart-api/trip/delete-trip.mutation'
import { useReopenTripMutation } from '@/apis/agdevx-cart-api/trip/reopen-trip.mutation'
import { useUpdateTripMutation } from '@/apis/agdevx-cart-api/trip/update-trip.mutation'
import { useTripsQuery } from '@/apis/agdevx-cart-api/trip/use-trips.query'
import { useAuth } from '@/auth/use-auth'
import { tripDetailPath } from '@/routes'
import { ConfirmDialog } from '@/shared/confirm-dialog'
import { EmptyState } from '@/shared/empty-state'
import { Fab } from '@/shared/fab'
import { PageHeader } from '@/shared/page-header'
import { SectionHeader } from '@/shared/section-header'
import { TripCard } from '@/shared/trip-card'
import { getGreeting } from '@/utils/greeting'

import { TripCreateForm } from './trip-create-form'

export const ShoppingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const greeting = getGreeting(new Date().getHours())
  const { data: trips, isLoading } = useTripsQuery()
  const createMutation = useCreateTripMutation()
  const updateMutation = useUpdateTripMutation()
  const deleteMutation = useDeleteTripMutation()
  const reopenMutation = useReopenTripMutation()

  const [showCreateForm, setShowCreateForm] = useState(false)
  // formKey forces the form to remount when opened, resetting its internal state
  const [formKey, setFormKey] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const inProgressTrips = trips?.filter((trip) => trip.isStarted && !trip.isCompleted) || []
  const planningTrips = trips?.filter((trip) => !trip.isStarted && !trip.isCompleted) || []
  const completedTrips = trips?.filter((trip) => trip.isCompleted)
    .sort((a, b) => {
      if (!a.completedAt || !b.completedAt) { return 0 }
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    }) || []

  const handleCreateTrip = async ({ name }: { name: string }) => {
    try {
      const newTrip = await createMutation.mutateAsync({ name })
      setShowCreateForm(false)
      navigate(tripDetailPath(newTrip.id))
    } catch {
      // Error toast shown by global MutationCache handler
    }
  }

  const handleUpdate = (tripId: string, name: string) => {
    updateMutation.mutate({ tripId, name })
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
      <div className="px-5 pt-7">
        <div className="h-9 w-48 bg-navy/8 animate-pulse rounded-lg mb-6" />
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="p-4 bg-surface rounded-xl shadow-sm space-y-3">
              <div className="h-3 w-3/5 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2.5 w-2/5 bg-navy/8 animate-pulse rounded-lg" />
              <div className="h-2 w-full bg-navy/8 animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4 animate-fade-in">
      <PageHeader>Your <span className="text-teal">Shopping Trips</span></PageHeader>
      <div className="px-5">
      {user?.name && (
        <div className="bg-gradient-to-br from-navy to-navy-soft rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-semibold text-teal-light text-center">
            {greeting}, {user.name} 👋
          </p>
        </div>
      )}

      {showCreateForm && (
        <TripCreateForm
          key={formKey}
          onSubmit={handleCreateTrip}
          onCancel={() => setShowCreateForm(false)}
          isPending={createMutation.isPending}
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
