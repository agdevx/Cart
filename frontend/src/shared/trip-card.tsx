// ABOUTME: TripCard component for displaying a trip with kebab menu actions
// ABOUTME: Supports inline edit form (name), delete, reopen actions with active/completed visual states
// ABOUTME: Delete opens a confirmation dialog with a 3-second hold-to-delete button

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Copy, MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import { activeTripPath, tripDetailPath } from '@/routes'

import { ActionCancelFormButtons } from './action-cancel-form-buttons'
import { ConfirmDialog } from './confirm-dialog'
import { DropdownMenu } from './dropdown-menu'

interface TripCardProps {
  trip: Trip
  onUpdate: (tripId: string, name: string, tripDate: string | null) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
  onDuplicate: (tripId: string) => void
}

/** Duration in milliseconds the user must hold the delete button before it fires */
const DELETE_HOLD_DURATION_MS = 3000

export const TripCard = ({ trip, onUpdate, onDelete, onReopen, onDuplicate }: TripCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(trip.name)
  const [editDate, setEditDate] = useState(trip.tripDate ?? '')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const kebabRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleKebabClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen((prev) => !prev)
  }

  const startEditing = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    setEditName(trip.name)
    setEditDate(trip.tripDate ?? '')
    setEditing(true)
  }

  const handleReopenClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onReopen(trip.id)
  }

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onDuplicate(trip.id)
  }

  const commitEdit = () => {
    const trimmed = editName.trim()
    if (trimmed) {
      onUpdate(trip.id, trimmed, editDate || null)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditName(trip.name)
  }

  /* For planned trips, prefer the explicit trip date; fall back to created date for older trips */
  const plannedDateSource = trip.tripDate ?? trip.createdDate
  const plannedDateLabel = new Date(plannedDateSource).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  const dateLabel = trip.isCompleted
    ? `Completed: ${trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}`
    : `Trip Date: ${plannedDateLabel}`

  const cardContent = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`font-display text-lg font-bold ${trip.isCompleted ? 'text-navy-soft' : 'text-navy'}`}>
            {trip.name}
          </h3>
          <p className="text-[13px] text-text-secondary font-medium mt-1">{dateLabel}</p>
        </div>
        <div>
          <button
            ref={kebabRef}
            onClick={handleKebabClick}
            aria-label="Trip actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <DropdownMenu anchorRef={kebabRef} onClose={() => setMenuOpen(false)}>
              <button
                onClick={startEditing}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDuplicateClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              {trip.isCompleted && (
                <button
                  onClick={handleReopenClick}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reopen
                </button>
              )}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setDeleteConfirm(true) }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </DropdownMenu>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-navy/10">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-navy-soft mb-1">Trip Name</label>
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-semibold text-navy-soft mb-1">Trip Date</label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-4 py-3 border border-navy/10 rounded-xl bg-surface text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>

          <ActionCancelFormButtons
            onCancel={cancelEdit}
            submitLabel="Save"
            isPending={false}
            disabled={!editName.trim()}
            type="button"
            onSubmit={commitEdit}
          />
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete "${trip.name}"? This can't be undone.`}
          confirmLabel="Hold to Delete"
          onConfirm={() => { setDeleteConfirm(false); onDelete(trip.id, trip.name) }}
          onCancel={() => setDeleteConfirm(false)}
          holdDuration={DELETE_HOLD_DURATION_MS}
        />
      )}
    </>
  )

  // When editing, render as div instead of link to prevent navigation
  if (editing) {
    return (
      <div className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent">
        {cardContent}
      </div>
    )
  }

  // Completed trips are read-only links
  if (trip.isCompleted) {
    return (
      <Link
        to={tripDetailPath(trip.id)}
        className="block p-5 bg-surface rounded-2xl shadow-sm opacity-60"
      >
        {cardContent}
      </Link>
    )
  }

  // In-progress trips link to active trip page; planning trips link to detail page
  const destination = (trip.isStarted && !trip.isCompleted)
    ? activeTripPath(trip.id)
    : tripDetailPath(trip.id)

  return (
    <Link
      to={destination}
      className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent"
    >
      {cardContent}
    </Link>
  )
}
