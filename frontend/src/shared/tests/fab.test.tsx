// ABOUTME: Tests for the Fab (floating action button) shared component
// ABOUTME: Covers single-action direct tap, multi-action menu open/close, and outside-click dismissal

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Fab } from '../fab'

describe('Fab', () => {
  describe('single action', () => {
    it('renders the FAB button', () => {
      render(<Fab actions={[{ label: 'Add Item', onClick: vi.fn() }]} />)

      expect(screen.getByRole('button', { name: 'Add Item' })).toBeInTheDocument()
    })

    it('calls onClick directly when tapped', async () => {
      const onClick = vi.fn()
      render(<Fab actions={[{ label: 'Add Item', onClick }]} />)

      await userEvent.click(screen.getByRole('button', { name: 'Add Item' }))

      expect(onClick).toHaveBeenCalledOnce()
    })

    it('does not render a menu', () => {
      render(<Fab actions={[{ label: 'Add Item', onClick: vi.fn() }]} />)

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  describe('multiple actions', () => {
    const multiActions = [
      { label: 'Add Item', onClick: vi.fn() },
      { label: 'Add Store', onClick: vi.fn() },
    ]

    it('does not show the menu initially', () => {
      render(<Fab actions={multiActions} />)

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
      expect(screen.queryByText('Add Store')).not.toBeInTheDocument()
    })

    it('opens the mini menu when FAB is tapped', async () => {
      render(<Fab actions={multiActions} />)

      await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Add Item' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Add Store' })).toBeInTheDocument()
    })

    it('calls the action onClick and closes the menu when an action is tapped', async () => {
      const addItem = vi.fn()
      render(<Fab actions={[{ label: 'Add Item', onClick: addItem }, { label: 'Add Store', onClick: vi.fn() }]} />)

      await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))
      await userEvent.click(screen.getByRole('menuitem', { name: 'Add Item' }))

      expect(addItem).toHaveBeenCalledOnce()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('closes the menu when FAB is tapped again', async () => {
      render(<Fab actions={multiActions} />)

      await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Close menu' }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('closes the menu when clicking outside', async () => {
      render(
        <div>
          <span data-testid="outside">Outside</span>
          <Fab actions={multiActions} />
        </div>
      )

      await userEvent.click(screen.getByRole('button', { name: 'Open actions menu' }))
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('outside'))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })
})
