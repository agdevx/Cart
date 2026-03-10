// ABOUTME: TripCard component for displaying a trip with kebab menu actions
// ABOUTME: Supports inline edit form (name + scope), delete, reopen actions with active/completed visual states

import { MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import { tripDetailPath } from '@/routes'

import { ScopeSelect } from './scope-select'

interface TripCardProps {
  trip: Trip
  onUpdate: (tripId: string, name: string, householdId: string | null) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
  households?: Array<{ id: string; name: string | null }>
}

export const TripCard = ({ trip, onUpdate, onDelete, onReopen, households }: TripCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(trip.name)
  const [editHouseholdId, setEditHouseholdId] = useState<string>(trip.householdId ?? 'personal')
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close menu on outside click (mousedown)
  useEffect(() => {
    if (!menuOpen) return

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen])

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
    setEditHouseholdId(trip.householdId ?? 'personal')
    setEditing(true)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onDelete(trip.id, trip.name)
  }

  const handleReopenClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onReopen(trip.id)
  }

  const commitEdit = () => {
    const trimmed = editName.trim()
    if (trimmed) {
      const resolvedHouseholdId = editHouseholdId === 'personal' ? null : editHouseholdId
      onUpdate(trip.id, trimmed, resolvedHouseholdId)
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditName(trip.name)
    setEditHouseholdId(trip.householdId ?? 'personal')
  }

  const dateLabel = trip.isCompleted
    ? `Completed: ${trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}`
    : trip.isStarted
    ? `Started: ${trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : 'N/A'}`
    : `Created: ${new Date(trip.createdDate).toLocaleDateString()}`

  const cardContent = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className={`font-display text-lg font-bold ${trip.isCompleted ? 'text-navy-soft' : 'text-navy'}`}>
            {trip.name}
          </h3>
          <p className="text-[13px] text-text-secondary font-medium mt-1">{dateLabel}</p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleKebabClick}
            aria-label="Trip actions"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-navy/8 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-10 min-w-[140px]">
              <button
                onClick={startEditing}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
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
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-coral hover:bg-coral/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
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
            <label className="block text-sm font-semibold text-navy-soft mb-1">Type</label>
            <ScopeSelect
              value={editHouseholdId}
              onChange={setEditHouseholdId}
              personalLabel="Personal Trip"
              households={households}
              householdDescription="Household"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={cancelEdit} className="flex-1 py-3 bg-bg-warm text-navy-soft rounded-xl font-semibold hover:bg-navy/10 transition-colors">
              Cancel
            </button>
            <button onClick={commitEdit} disabled={!editName.trim()} className="flex-1 py-3 bg-teal text-white rounded-xl font-display font-bold hover:bg-teal-light disabled:bg-bg-warm disabled:text-text-tertiary transition-colors">
              Save
            </button>
          </div>
        </div>
      )}
    </>
  )

  // Active trips are links (unless editing), completed trips are read-only links
  if (trip.isCompleted) {
    return (
      <Link
        to={tripDetailPath(trip.id)}
        className="block p-5 bg-surface rounded-2xl shadow-sm opacity-60 hover:shadow-md transition-all"
      >
        {cardContent}
      </Link>
    )
  }

  // When editing, render as div instead of link to prevent navigation
  if (editing) {
    return (
      <div className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent hover:shadow-md hover:-translate-y-0.5 transition-all">
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      to={tripDetailPath(trip.id)}
      className="block p-5 bg-surface rounded-2xl shadow-sm border-2 border-transparent hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {cardContent}
    </Link>
  )
}
