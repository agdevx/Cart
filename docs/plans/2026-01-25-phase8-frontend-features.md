# Phase 8: Frontend Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all user-facing features including household management, inventory, stores, trip builder, active trip with real-time SSE updates, and collaboration UI.

**Architecture:** Feature-based React components with TanStack Query for server state, Jotai for client state, and EventSource API for real-time Server-Sent Events. All features follow consistent patterns with loading states, error handling, and optimistic updates.

**Tech Stack:** React 19, TypeScript, TanStack Query, Jotai, EventSource API, TailwindCSS

---

## Task 32: Household Management UI

**Files:**
- Create: `frontend/src/types/household.ts`
- Create: `frontend/src/services/householdService.ts`
- Create: `frontend/src/hooks/useHouseholds.ts`
- Create: `frontend/src/components/HouseholdSelector.tsx`
- Create: `frontend/src/components/CreateHouseholdModal.tsx`
- Modify: `frontend/src/components/Layout.tsx`

**Step 1: Create household types**

Create `frontend/src/types/household.ts`:
```typescript
export interface Household {
  id: string
  name: string
  ownerId: string
  createdAt: string
}

export interface CreateHouseholdRequest {
  name: string
}

export interface InviteMemberRequest {
  email: string
}

export interface HouseholdMember {
  userId: string
  displayName: string
  email: string
  joinedAt: string
}
```

**Step 2: Create household service**

Create `frontend/src/services/householdService.ts`:
```typescript
import { api } from './api'
import type { Household, CreateHouseholdRequest, HouseholdMember, InviteMemberRequest } from '../types/household'

export const householdService = {
  async getAll(): Promise<Household[]> {
    return api.get<Household[]>('/households')
  },

  async getById(id: string): Promise<Household> {
    return api.get<Household>(`/households/${id}`)
  },

  async create(data: CreateHouseholdRequest): Promise<Household> {
    return api.post<Household>('/households', data)
  },

  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    return api.get<HouseholdMember[]>(`/households/${householdId}/members`)
  },

  async inviteMember(householdId: string, data: InviteMemberRequest): Promise<void> {
    return api.post<void>(`/households/${householdId}/invite`, data)
  },
}
```

**Step 3: Create useHouseholds hook**

Create `frontend/src/hooks/useHouseholds.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAtom } from 'jotai'
import { householdService } from '../services/householdService'
import { selectedHouseholdAtom } from '../lib/atoms'
import type { CreateHouseholdRequest } from '../types/household'

export function useHouseholds() {
  const queryClient = useQueryClient()
  const [selectedHousehold, setSelectedHousehold] = useAtom(selectedHouseholdAtom)

  const { data: households = [], isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => householdService.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateHouseholdRequest) => householdService.create(data),
    onSuccess: (newHousehold) => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      setSelectedHousehold(newHousehold)
    },
  })

  return {
    households,
    isLoading,
    selectedHousehold,
    setSelectedHousehold,
    createHousehold: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message,
  }
}
```

**Step 4: Create HouseholdSelector component**

Create `frontend/src/components/HouseholdSelector.tsx`:
```typescript
import { useState } from 'react'
import { useHouseholds } from '../hooks/useHouseholds'
import CreateHouseholdModal from './CreateHouseholdModal'

export default function HouseholdSelector() {
  const [showModal, setShowModal] = useState(false)
  const { households, selectedHousehold, setSelectedHousehold, isLoading } = useHouseholds()

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading households...</div>
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <select
          value={selectedHousehold?.id || ''}
          onChange={(e) => {
            const household = households.find(h => h.id === e.target.value)
            setSelectedHousehold(household || null)
          }}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value="">Select household</option>
          {households.map((household) => (
            <option key={household.id} value={household.id}>
              {household.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          + New
        </button>
      </div>

      {showModal && (
        <CreateHouseholdModal onClose={() => setShowModal(false)} />
      )}
    </>
  )
}
```

**Step 5: Create CreateHouseholdModal**

Create `frontend/src/components/CreateHouseholdModal.tsx`:
```typescript
import { useState } from 'react'
import { useHouseholds } from '../hooks/useHouseholds'

interface Props {
  onClose: () => void
}

export default function CreateHouseholdModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const { createHousehold, isCreating, createError } = useHouseholds()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createHousehold({ name }, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create Household</h2>

        {createError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {createError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">Household Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 6: Update Layout**

Modify `frontend/src/components/Layout.tsx` to add HouseholdSelector:
```typescript
import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import HouseholdSelector from './HouseholdSelector'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold text-primary-600">
                AGDevX Cart
              </h1>
              <HouseholdSelector />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.displayName}
              </span>
              <button onClick={logout} className="btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

**Step 7: Test household management**

Run backend and frontend, verify can create households and switch between them

**Step 8: Commit**

Run:
```bash
git add .
git commit -m "feat: add household management UI with selector and creation"
```

Expected: Commit created

---

## Task 33: Inventory Management UI

**Files:**
- Create: `frontend/src/types/inventory.ts`
- Create: `frontend/src/services/inventoryService.ts`
- Create: `frontend/src/hooks/useInventory.ts`
- Create: `frontend/src/pages/InventoryPage.tsx`
- Create: `frontend/src/components/InventoryList.tsx`
- Create: `frontend/src/components/InventoryItemModal.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create inventory types**

Create `frontend/src/types/inventory.ts`:
```typescript
export interface InventoryItem {
  id: string
  householdId: string
  userId: string
  name: string
  quantity: number
  unit: string
  isPersonal: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateInventoryItemRequest {
  householdId: string
  name: string
  quantity: number
  unit: string
  isPersonal: boolean
  notes?: string
}

export interface UpdateInventoryItemRequest {
  name?: string
  quantity?: number
  unit?: string
  notes?: string
}
```

**Step 2: Create inventory service**

Create `frontend/src/services/inventoryService.ts`:
```typescript
import { api } from './api'
import type { InventoryItem, CreateInventoryItemRequest, UpdateInventoryItemRequest } from '../types/inventory'

export const inventoryService = {
  async getAll(householdId: string): Promise<InventoryItem[]> {
    return api.get<InventoryItem[]>(`/inventory?householdId=${householdId}`)
  },

  async create(data: CreateInventoryItemRequest): Promise<InventoryItem> {
    return api.post<InventoryItem>('/inventory', data)
  },

  async update(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItem> {
    return api.put<InventoryItem>(`/inventory/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/inventory/${id}`)
  },
}
```

**Step 3: Create useInventory hook**

Create `frontend/src/hooks/useInventory.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '../services/inventoryService'
import type { CreateInventoryItemRequest, UpdateInventoryItemRequest } from '../types/inventory'

export function useInventory(householdId: string | undefined) {
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory', householdId],
    queryFn: () => inventoryService.getAll(householdId!),
    enabled: !!householdId,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryItemRequest) => inventoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryItemRequest }) =>
      inventoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', householdId] })
    },
  })

  return {
    items,
    isLoading,
    createItem: createMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

**Step 4: Create InventoryPage**

Create `frontend/src/pages/InventoryPage.tsx`:
```typescript
import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { selectedHouseholdAtom } from '../lib/atoms'
import { useInventory } from '../hooks/useInventory'
import InventoryList from '../components/InventoryList'
import InventoryItemModal from '../components/InventoryItemModal'

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const selectedHousehold = useAtomValue(selectedHouseholdAtom)
  const { items, isLoading } = useInventory(selectedHousehold?.id)

  if (!selectedHousehold) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="card">
          <p className="text-gray-600">Please select a household first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + Add Item
        </button>
      </div>

      {isLoading ? (
        <div className="card">
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      ) : (
        <InventoryList
          items={items}
          onEdit={(item) => {
            setEditingItem(item)
            setShowModal(true)
          }}
        />
      )}

      {showModal && (
        <InventoryItemModal
          householdId={selectedHousehold.id}
          item={editingItem}
          onClose={() => {
            setShowModal(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}
```

**Step 5: Create InventoryList**

Create `frontend/src/components/InventoryList.tsx`:
```typescript
import { useInventory } from '../hooks/useInventory'
import type { InventoryItem } from '../types/inventory'

interface Props {
  items: InventoryItem[]
  onEdit: (item: InventoryItem) => void
}

export default function InventoryList({ items, onEdit }: Props) {
  const { deleteItem } = useInventory(items[0]?.householdId)

  if (items.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-600">No items yet. Add your first item!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.id} className="card flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{item.name}</h3>
              {item.isPersonal && (
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  Personal
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">
              {item.quantity} {item.unit}
            </p>
            {item.notes && (
              <p className="text-gray-500 text-sm mt-1">{item.notes}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Edit
            </button>
            <button
              onClick={() => deleteItem(item.id)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 6: Create InventoryItemModal**

Create `frontend/src/components/InventoryItemModal.tsx`:
```typescript
import { useState } from 'react'
import { useInventory } from '../hooks/useInventory'
import type { InventoryItem } from '../types/inventory'

interface Props {
  householdId: string
  item?: InventoryItem
  onClose: () => void
}

export default function InventoryItemModal({ householdId, item, onClose }: Props) {
  const [name, setName] = useState(item?.name || '')
  const [quantity, setQuantity] = useState(item?.quantity || 1)
  const [unit, setUnit] = useState(item?.unit || 'units')
  const [isPersonal, setIsPersonal] = useState(item?.isPersonal || false)
  const [notes, setNotes] = useState(item?.notes || '')

  const { createItem, updateItem, isCreating, isUpdating } = useInventory(householdId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (item) {
      updateItem({
        id: item.id,
        data: { name, quantity, unit, notes: notes || undefined },
      }, {
        onSuccess: () => onClose(),
      })
    } else {
      createItem({
        householdId,
        name,
        quantity,
        unit,
        isPersonal,
        notes: notes || undefined,
      }, {
        onSuccess: () => onClose(),
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="card max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {item ? 'Edit Item' : 'Add Item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="label">Quantity</label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="unit" className="label">Unit</label>
              <input
                id="unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {!item && (
            <div className="flex items-center gap-2">
              <input
                id="isPersonal"
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isPersonal" className="text-sm text-gray-700">
                Personal item
              </label>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="label">Notes (optional)</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 7: Add route to App**

Modify `frontend/src/App.tsx` to add inventory route:
```typescript
import InventoryPage from './pages/InventoryPage'

// In the router config, add to Layout children:
{
  path: '/inventory',
  element: <InventoryPage />,
}
```

**Step 8: Test inventory management**

Run backend and frontend, verify CRUD operations work

**Step 9: Commit**

Run:
```bash
git add .
git commit -m "feat: add inventory management UI with CRUD operations"
```

Expected: Commit created

---

## Task 34: Store Management UI

**Files:**
- Create: `frontend/src/types/store.ts`
- Create: `frontend/src/services/storeService.ts`
- Create: `frontend/src/hooks/useStores.ts`
- Create: `frontend/src/pages/StoresPage.tsx`
- Create: `frontend/src/components/StoreList.tsx`
- Create: `frontend/src/components/StoreModal.tsx`
- Modify: `frontend/src/App.tsx`

Follow same pattern as Task 33 (Inventory), implementing:
- Store types (id, name, address, householdId)
- Store service (getAll, create, update, delete)
- useStores hook
- StoresPage with list and modal
- Add /stores route

**Commit:**
```bash
git add .
git commit -m "feat: add store management UI"
```

---

## Task 35: Trip Builder UI

**Files:**
- Create: `frontend/src/types/trip.ts`
- Create: `frontend/src/services/tripService.ts`
- Create: `frontend/src/hooks/useTrips.ts`
- Create: `frontend/src/pages/TripBuilderPage.tsx`
- Create: `frontend/src/components/TripItemSelector.tsx`
- Modify: `frontend/src/App.tsx`

Implement trip creation UI where users select store, add items from inventory, set quantities, and create trip.

**Commit:**
```bash
git add .
git commit -m "feat: add trip builder UI"
```

---

## Task 36: Active Trip with Real-Time Updates

**Files:**
- Create: `frontend/src/hooks/useTripEvents.ts`
- Create: `frontend/src/pages/ActiveTripPage.tsx`
- Create: `frontend/src/components/TripItemList.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create useTripEvents hook**

Create `frontend/src/hooks/useTripEvents.ts`:
```typescript
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export interface TripEvent {
  tripId: string
  eventType: 'ItemChecked' | 'ItemUnchecked' | 'ItemQuantityChanged'
  itemId: string
  timestamp: string
  userId: string
}

export function useTripEvents(tripId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const token = localStorage.getItem('accessToken')
    const eventSource = new EventSource(
      `/api/trips/${tripId}/events`,
      { withCredentials: true }
    )

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      const tripEvent: TripEvent = JSON.parse(event.data)
      queryClient.invalidateQueries({ queryKey: ['tripItems', tripId] })
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [tripId, queryClient])

  return { isConnected }
}
```

**Step 2: Create ActiveTripPage with SSE**

Create `frontend/src/pages/ActiveTripPage.tsx`:
```typescript
import { useParams } from 'react-router-dom'
import { useTripEvents } from '../hooks/useTripEvents'
import { useQuery } from '@tanstack/react-query'
import { tripService } from '../services/tripService'
import TripItemList from '../components/TripItemList'

export default function ActiveTripPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { isConnected } = useTripEvents(tripId)

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripService.getById(tripId!),
    enabled: !!tripId,
  })

  const { data: items = [] } = useQuery({
    queryKey: ['tripItems', tripId],
    queryFn: () => tripService.getItems(tripId!),
    enabled: !!tripId,
  })

  if (isLoading) {
    return <div className="max-w-7xl mx-auto p-8">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{trip?.storeName}</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live updates active' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </div>

      <TripItemList tripId={tripId!} items={items} />
    </div>
  )
}
```

**Step 3: Create TripItemList with check/uncheck**

Create `frontend/src/components/TripItemList.tsx`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tripService } from '../services/tripService'
import type { TripItem } from '../types/trip'

interface Props {
  tripId: string
  items: TripItem[]
}

export default function TripItemList({ tripId, items }: Props) {
  const queryClient = useQueryClient()

  const checkMutation = useMutation({
    mutationFn: (itemId: string) => tripService.checkItem(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripItems', tripId] })
    },
  })

  const uncheckMutation = useMutation({
    mutationFn: (itemId: string) => tripService.uncheckItem(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripItems', tripId] })
    },
  })

  const handleToggle = (item: TripItem) => {
    if (item.isChecked) {
      uncheckMutation.mutate(item.id)
    } else {
      checkMutation.mutate(item.id)
    }
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`card flex items-center gap-4 ${
            item.isChecked ? 'bg-gray-50' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={item.isChecked}
            onChange={() => handleToggle(item)}
            className="w-5 h-5"
          />
          <div className="flex-1">
            <h3 className={`font-medium ${item.isChecked ? 'line-through text-gray-500' : ''}`}>
              {item.itemName}
            </h3>
            <p className="text-sm text-gray-600">
              {item.quantity} {item.unit}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Add route**

Add /trips/:tripId route to App.tsx

**Step 5: Test real-time updates**

Open trip in two browser windows, check/uncheck items, verify both update in real-time

**Step 6: Commit**

Run:
```bash
git add .
git commit -m "feat: add active trip UI with real-time SSE updates"
```

Expected: Commit created

---

## Task 37: Trip History UI

**Files:**
- Create: `frontend/src/pages/TripsPage.tsx`
- Create: `frontend/src/components/TripCard.tsx`
- Modify: `frontend/src/App.tsx`

Implement list of past and active trips with status, store, date, completion percentage.

**Commit:**
```bash
git add .
git commit -m "feat: add trip history UI"
```

---

## Task 38: Navigation and Dashboard

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

Add navigation links in Layout and quick stats/actions on Dashboard.

**Commit:**
```bash
git add .
git commit -m "feat: add navigation and dashboard overview"
```

---

## Phase 8 Complete!

All frontend features implemented with real-time collaboration via SSE.

**Next:** Phase 9 - Docker & Deployment
