// ABOUTME: Inventory management page with Items/Stores segmented control
// ABOUTME: Displays household and personal inventory items with add/delete actions

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useDeleteInventoryItemMutation } from '@/apis/agdevx-cart-api/inventory/delete-inventory-item.mutation'
import { useInventoryQuery } from '@/apis/agdevx-cart-api/inventory/use-inventory.query'
import { InventoryStoresView } from '@/pages/inventory-stores-view'

type InventoryTab = 'items' | 'stores'

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const { data: inventory, isLoading } = useInventoryQuery()
  const deleteMutation = useDeleteInventoryItemMutation()

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (isLoading) {
    return (
      <div className="px-5 pt-14">
        <p className="text-text-secondary">Loading inventory...</p>
      </div>
    )
  }

  const householdItems = inventory?.filter((item) => item.householdId !== null) || []
  const personalItems = inventory?.filter((item) => item.ownerUserId !== null) || []

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-display text-[28px] font-extrabold text-navy tracking-tight">
          Your <span className="text-teal">Pantry</span>
        </h1>
        {activeTab === 'items' && (
          <Link
            to="/inventory/add"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal text-white rounded-xl font-display font-bold text-sm hover:bg-teal-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Link>
        )}
      </div>

      {/* Segmented Control */}
      <div className="flex bg-bg-warm rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'items'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Items
        </button>
        <button
          onClick={() => setActiveTab('stores')}
          className={`flex-1 py-2 text-sm font-display font-bold rounded-lg transition-colors ${
            activeTab === 'stores'
              ? 'bg-teal text-white shadow-sm'
              : 'text-text-secondary hover:text-navy'
          }`}
        >
          Stores
        </button>
      </div>

      {/* Items View */}
      {activeTab === 'items' && (
        <>
          {householdItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Household Items</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {householdItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-start"
                  >
                    <div>
                      <h3 className="font-bold text-navy">{item.name}</h3>
                      {item.notes && (
                        <p className="text-sm text-text-secondary mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-coral hover:text-coral/80 text-sm font-semibold"
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
              <div className="flex items-center gap-2.5 mb-3">
                <span className="font-display text-xs font-semibold uppercase tracking-[2px] text-text-tertiary">Personal Items</span>
                <span className="flex-1 h-px bg-navy/8" />
              </div>
              <div className="space-y-2">
                {personalItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-surface rounded-xl shadow-sm flex justify-between items-start"
                  >
                    <div>
                      <h3 className="font-bold text-navy">{item.name}</h3>
                      {item.notes && (
                        <p className="text-sm text-text-secondary mt-0.5">{item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-coral hover:text-coral/80 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inventory && inventory.length === 0 && (
            <p className="text-text-secondary mt-4">No inventory items yet. Add your first item!</p>
          )}
        </>
      )}

      {/* Stores View */}
      {activeTab === 'stores' && <InventoryStoresView />}
    </div>
  )
}
