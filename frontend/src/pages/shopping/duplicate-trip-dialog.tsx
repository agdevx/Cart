// ABOUTME: Modal dialog for duplicating a trip with new name, date, and scope
// ABOUTME: Triggered from trip card kebab menu and trip detail page

import { useState } from 'react'

import { toast } from 'sonner'

import { useDuplicateTripMutation } from '@/apis/agdevx-cart-api/trip/duplicate-trip.mutation'
import { ActionCancelFormButtons } from '@/shared/action-cancel-form-buttons'
import { FormField } from '@/shared/form-field'
import { ScopeRadio } from '@/shared/scope-radio'

interface DuplicateTripDialogProps {
  sourceTripId: string
  sourceHouseholdId: string | null
  household: { id: string; name: string } | null
  onClose: () => void
  onSuccess: (newTripId: string) => void
}

export const DuplicateTripDialog = ({ sourceTripId, sourceHouseholdId, household, onClose, onSuccess }: DuplicateTripDialogProps) => {
  const [name, setName] = useState('')
  const [tripDate, setTripDate] = useState('')
  const [scope, setScope] = useState<string>(sourceHouseholdId ?? 'personal')
  const duplicateMutation = useDuplicateTripMutation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) return

    duplicateMutation.mutate(
      {
        sourceTripId,
        name: trimmedName,
        tripDate: tripDate || null,
        householdId: scope === 'personal' ? null : scope,
      },
      {
        onSuccess: (newTrip) => {
          toast.success('Trip created')
          onSuccess(newTrip.id)
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-surface rounded-2xl shadow-lg p-5 animate-fade-in"
      >
        <h2 className="font-display text-lg font-bold text-navy mb-4">Duplicate Trip</h2>

        <FormField label="Trip Name" htmlFor="dup-trip-name" required>
          <input
            id="dup-trip-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Weekly Groceries"
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={duplicateMutation.isPending}
          />
        </FormField>

        <FormField label="Trip Date" htmlFor="dup-trip-date">
          <input
            id="dup-trip-date"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
            className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            disabled={duplicateMutation.isPending}
          />
        </FormField>

        {household && (
          <FormField label="Scope" htmlFor="dup-trip-scope" required>
            <ScopeRadio
              value={scope}
              onChange={setScope}
              household={household}
              disabled={duplicateMutation.isPending}
            />
          </FormField>
        )}

        <ActionCancelFormButtons
          onCancel={onClose}
          submitLabel="Create"
          isPending={duplicateMutation.isPending}
          disabled={!name.trim() || (household !== null && scope === '')}
        />
      </form>
    </div>
  )
}
