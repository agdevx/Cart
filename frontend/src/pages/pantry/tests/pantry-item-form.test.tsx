// ABOUTME: Tests for CreatePantryItemForm component
// ABOUTME: Verifies scope defaulting, form validation, and submit behavior

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreatePantryItemForm } from '../pantry-item-form'

describe('CreatePantryItemForm', () => {
	it('defaults scope to personal and enables Create when name is entered without household', async () => {
		const user = userEvent.setup()

		render(
			<CreatePantryItemForm
				initialScope="personal"
				household={null}
				allStores={[]}
				storeDisplayNames={new Map()}
				isPending={false}
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
			/>
		)

		//== Scope radio should not appear when there is no household
		expect(screen.queryByText('Scope')).not.toBeInTheDocument()

		//== Type a name
		await user.type(screen.getByLabelText('Item Name'), 'Bananas')

		//== Create button should be enabled — scope defaults to 'personal' internally
		const createButton = screen.getByRole('button', { name: 'Create' })
		expect(createButton).not.toBeDisabled()
	})

	it('submits with householdId null when no household is present', async () => {
		const user = userEvent.setup()
		const mockOnSubmit = vi.fn()

		render(
			<CreatePantryItemForm
				initialScope="personal"
				household={null}
				allStores={[]}
				storeDisplayNames={new Map()}
				isPending={false}
				onSubmit={mockOnSubmit}
				onCancel={vi.fn()}
			/>
		)

		await user.type(screen.getByLabelText('Item Name'), 'Bananas')
		await user.click(screen.getByRole('button', { name: 'Create' }))

		expect(mockOnSubmit).toHaveBeenCalledWith({
			name: 'Bananas',
			notes: null,
			householdId: null,
			defaultStoreId: null,
		})
	})
})
