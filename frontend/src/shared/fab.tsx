// ABOUTME: Floating action button (FAB) component for primary page actions
// ABOUTME: Supports single-action (direct tap) and multi-action (expandable mini menu) modes

import { useEffect, useRef, useState } from 'react'

import { Plus, X } from 'lucide-react'

interface FabAction {
  readonly label: string
  readonly onClick: () => void
}

interface FabProps {
  readonly actions: ReadonlyArray<FabAction>
}

export const Fab = ({ actions }: FabProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  /* Close the menu when clicking outside */
  useEffect(() => {
    if (!menuOpen) { return }

    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => { document.removeEventListener('mousedown', handleMouseDown) }
  }, [menuOpen])

  const handleFabClick = () => {
    if (actions.length === 1) {
      actions[0].onClick()
    } else {
      setMenuOpen((prev) => !prev)
    }
  }

  const handleActionClick = (action: FabAction) => {
    setMenuOpen(false)
    action.onClick()
  }

  return (
    <div ref={containerRef} className="fixed bottom-20 right-5 z-20 flex flex-col items-end gap-2">
      {/* Mini menu — shown above FAB when multi-action mode is open */}
      {actions.length > 1 && menuOpen && (
        <div
          role="menu"
          className="flex flex-col items-end gap-2 animate-fade-in"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              role="menuitem"
              onClick={() => handleActionClick(action)}
              className="bg-surface rounded-xl shadow-md px-4 py-3 text-sm font-display font-bold text-navy whitespace-nowrap active:scale-95 transition-transform"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        aria-label={actions.length === 1 ? actions[0].label : menuOpen ? 'Close menu' : 'Open actions menu'}
        aria-expanded={actions.length > 1 ? menuOpen : undefined}
        aria-haspopup={actions.length > 1 ? 'menu' : undefined}
        onClick={handleFabClick}
        className="w-14 h-14 rounded-full bg-teal text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        {actions.length > 1 && menuOpen
          ? <X className="w-6 h-6" />
          : <Plus className="w-6 h-6" />
        }
      </button>
    </div>
  )
}
