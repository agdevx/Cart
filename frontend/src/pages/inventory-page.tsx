// ABOUTME: Inventory management page
// ABOUTME: Displays household and personal inventory items with add/delete actions

import { Link } from 'react-router-dom'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'

export const InventoryPage = () => {
  const { data: inventory, isLoading } = useInventoryQuery()
  const deleteMutation = useDeleteInventoryItemMutation()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading inventory...</p>
      </div>
    )
  }

  const householdItems = inventory?.filter((item) => item.householdId !== null) || []
  const personalItems = inventory?.filter((item) => item.ownerUserId !== null) || []

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Link
          to="/inventory/add"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Item
        </Link>
      </div>

      {householdItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Household Items</h2>
          <div className="space-y-2">
            {householdItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white border rounded shadow-sm flex justify-between items-start"
              >
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.notes && (
                    <p className="text-sm text-gray-600">{item.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {personalItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Personal Items</h2>
          <div className="space-y-2">
            {personalItems.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white border rounded shadow-sm flex justify-between items-start"
              >
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.notes && (
                    <p className="text-sm text-gray-600">{item.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inventory && inventory.length === 0 && (
        <p className="text-gray-600">No inventory items yet. Add your first item!</p>
      )}
    </div>
  )
}
