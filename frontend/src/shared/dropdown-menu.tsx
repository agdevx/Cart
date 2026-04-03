// ABOUTME: Portal-based dropdown menu that escapes overflow-hidden containers
// ABOUTME: Used by kebab menus on trip cards and trip item rows

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  onClose: () => void
}

export const DropdownMenu = ({ anchorRef, children, onClose }: DropdownMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top?: number; bottom?: number; right: number }>({ top: 0, right: 0 })

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) { return }

    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? 150
    const spaceBelow = window.innerHeight - rect.bottom
    const gap = 4

    /*
     * Prefer showing the menu below the anchor. If there isn't enough room
     * below (menu height + gap), flip it above instead.
     */
    if (spaceBelow >= menuHeight + gap) {
      setPosition({ top: rect.bottom + gap, right: window.innerWidth - rect.right })
    } else {
      setPosition({ bottom: window.innerHeight - rect.top + gap, right: window.innerWidth - rect.right })
    }
  }, [anchorRef])

  useEffect(() => {
    updatePosition()
  }, [updatePosition])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
    }

    const handleScroll = () => {
      updatePosition()
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchorRef, onClose, updatePosition])

  return createPortal(
    <div
      ref={menuRef}
      className="fixed bg-surface rounded-xl shadow-lg border border-navy/10 py-1 z-50 min-w-[140px]"
      style={{ top: position.top, bottom: position.bottom, right: position.right }}
    >
      {children}
    </div>,
    document.body
  )
}
