// ABOUTME: TripCard component for displaying a trip with kebab menu actions
// ABOUTME: Supports inline rename, delete, reopen actions with active/completed visual states

import { MoreVertical, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Trip } from '@/apis/agdevx-cart-api/models/trip'
import { tripDetailPath } from '@/routes'

interface TripCardProps {
  trip: Trip
  onRename: (tripId: string, newName: string) => void
  onDelete: (tripId: string, tripName: string) => void
  onReopen: (tripId: string) => void
}

export const TripCard = ({ trip, onRename, onDelete, onReopen }: TripCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(trip.name)
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

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    setEditValue(trip.name)
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

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== trip.name) {
      onRename(trip.id, trimmed)
    }
    setEditing(false)
  }

  const cancelRename = () => {
    setEditing(false)
    setEditValue(trip.name)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  const handleBlur = () => {
    commitRename()
  }

  const dateLabel = trip.isCompleted
    ? `Completed: ${trip.completedAt ? new Date(trip.completedAt).toLocaleDateString() : 'N/A'}`
    : trip.isStarted
    ? `Started: ${trip.startedAt ? new Date(trip.startedAt).toLocaleDateString() : 'N/A'}`
    : `Created: ${new Date(trip.createdDate).toLocaleDateString()}`

  const nameElement = editing ? (
    <input
      ref={inputRef}
      type="text"
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="font-display text-lg font-bold text-navy bg-transparent border-b-2 border-teal outline-none w-full"
    />
  ) : (
    <h3 className={`font-display text-lg font-bold ${trip.isCompleted ? 'text-navy-soft' : 'text-navy'}`}>
      {trip.name}
    </h3>
  )

  const cardContent = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {nameElement}
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
                onClick={handleRenameClick}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-navy hover:bg-navy/5 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Rename
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
    </>
  )

  // Active trips are links (unless editing), completed trips are static divs
  if (trip.isCompleted) {
    return (
      <div className="p-5 bg-surface rounded-2xl shadow-sm opacity-60">
        {cardContent}
      </div>
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
