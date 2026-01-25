# Grocery Shopping App Design

**Date:** 2026-01-24
**Status:** Approved
**Author:** Claude & August

## Overview

A self-hosted grocery shopping list application designed for household collaboration. The app enables users to manage a master inventory of regularly purchased items, create shopping trips by selecting from inventory, and collaborate in real-time during multi-store shopping runs.

### Key Goals
- Simple, intuitive interface for daily grocery shopping
- Real-time collaboration for divide-and-conquer shopping
- Flexible store assignment with household-specific store lists
- Privacy controls for personal vs household items
- Self-hosted on mini-PC accessible via TailScale

### Non-Goals
- Recipe management
- Price tracking or budgeting
- Complex categorization systems
- Public internet accessibility

## User Model & Households

### Users
- Individual accounts with email/password authentication
- Can belong to zero or more households
- Have personal private inventory visible only to them
- Can create personal trips or household-scoped trips

### Households
- Optional collaboration groups that share inventory and trips
- Users can belong to multiple households
- Each household has its own shared inventory
- Members can invite others via email/username
- Users can leave households (deletion rules TBD for last member)

### Household Context Switching
When users belong to multiple households, they switch context via a household selector. Personal inventory remains global across all households.

## Core Data Model

### Inventory Items
The master catalog of products users buy regularly.

**Attributes:**
- Name (e.g., "2% Milk")
- Default store preference
- Notes (e.g., "organic only")
- Ownership scope (household-shared or user-private)

**Ownership Scopes:**
- **Household items**: Scoped to specific household, visible and editable by all members (including store preferences)
- **Personal items**: Private to creating user, visible across all their households
- Each household has its own separate shared inventory

**Store Preferences:**
- Household items have one shared store preference (last editor wins)
- Personal items have store preference editable only by owner
- Store can be overridden when adding to trips or during shopping

### Trips
Discrete shopping sessions containing selected inventory items.

**Attributes:**
- Name/description
- Household scope (or personal if no household)
- Creator and optional collaborators
- Completion status (active or completed)
- Timestamps (created, completed)

**Trip Items:**
- Reference to inventory item
- Quantity (required, positive integer)
- Store assignment (defaults from inventory, overridable)
- Trip-specific notes
- Checked status and timestamp
- Personal inventory items remain visible only to owner in shared trips

**Trip Lifecycle:**
1. Created in active state (fully editable)
2. Items can be added/removed/modified at any time
3. Collaborators can be added/removed
4. When done, user marks trip as completed (becomes read-only)
5. Completed trips can be reopened for editing
6. Completed again when finished

### Stores
Each household maintains their own list of stores.

**Attributes:**
- Name (e.g., "Walmart", "Target")
- Household scope

**Management:**
- Household members can add/edit/delete stores
- Dropdown selection when assigning items
- Deleting stores requires reassigning items first

Personal inventory items use a user-specific store list.

## Trip Workflow

### Creating a Trip
1. User selects household context (or personal)
2. Clicks "New Trip"
3. Sees merged view of household inventory + personal inventory
4. Can search/filter or scroll through items
5. Selects items and specifies quantities
6. Store assignments default from inventory but can be overridden
7. Can add trip-specific notes per item
8. Can add new items on-the-fly (auto-saved to inventory)
9. Can invite household members to collaborate

### During Shopping
- Items displayed grouped by store
- Within each store section, items shown as flat list
- Users check off items as they grab them
- Checked items remain visible but marked complete
- Changes sync in real-time to collaborators via SSE
- Personal items only visible to their owner (even in shared trips)
- Fully editable: can change stores, quantities, add/remove items mid-shop

### Real-Time Collaboration
- Multiple users can view and edit the same trip simultaneously
- SSE connection per trip provides real-time updates
- When one collaborator checks off an item, others see it immediately
- Prevents duplicate purchases during divide-and-conquer shopping
- If SSE connection drops, EventSource API auto-reconnects

### After Shopping
- Trip remains active until user clicks "Complete Trip"
- Completed trips become read-only archives
- Can be reopened for editing if needed
- Trip history shows all past trips for review

## Technology Stack

### Backend API
- **Framework**: ASP.NET Core Web API
- **Language**: C#
- **Database**: SQLite (single file, zero config)
- **Real-time**: Server-Sent Events (SSE)
- **Authentication**: JWT tokens (Phase 1), migrate to Auth0 (Phase 2)
- **ORM**: Entity Framework Core
- **Hosting**: Docker container on mini-PC

### Frontend PWA
- **Framework**: React
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router
- **Server State**: TanStack Query
- **Client State**: Jotai
- **HTTP**: Native fetch API
- **Real-time**: EventSource API (SSE)
- **Build**: Vite

### Infrastructure
- **Reverse Proxy**: Caddy (handles HTTPS, serves PWA)
- **Containerization**: Docker + Docker Compose
- **Network**: TailScale (private network access)
- **Database**: SQLite file mounted as Docker volume

## Database Schema

### Audit Columns (All Tables)
All tables include:
- `CreatedBy` (UserId)
- `CreatedDate` (DateTime)
- `ModifiedBy` (UserId)
- `ModifiedDate` (DateTime)

### Core Tables

**Users**
- Id (PK)
- Email
- PasswordHash (removed when migrating to Auth0)
- DisplayName

**Households**
- Id (PK)
- Name

**HouseholdMembers**
- HouseholdId (FK)
- UserId (FK)
- JoinedAt
- Role (owner/member)

**Stores**
- Id (PK)
- Name
- HouseholdId (FK, nullable for personal stores)
- UserId (FK, nullable, for personal store lists)

**InventoryItems**
- Id (PK)
- Name
- DefaultStoreId (FK to Stores)
- Notes
- OwnerUserId (FK, null = household item)
- HouseholdId (FK, null = personal item)

**Trips**
- Id (PK)
- Name
- HouseholdId (FK, null = personal)
- CreatedByUserId (FK)
- IsCompleted
- CompletedAt

**TripCollaborators**
- TripId (FK)
- UserId (FK)

**TripItems**
- Id (PK)
- TripId (FK)
- InventoryItemId (FK)
- Quantity
- StoreId (FK, overridden from inventory default)
- Notes (trip-specific)
- IsChecked
- CheckedAt

## API Structure

### Authentication Endpoints
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and receive JWT
- `POST /api/auth/refresh` - Refresh expired token

### Household Endpoints
- `GET /api/households` - List user's households
- `POST /api/households` - Create household
- `GET /api/households/{id}` - Get household details
- `PUT /api/households/{id}` - Update household
- `POST /api/households/{id}/invite` - Invite member
- `DELETE /api/households/{id}/members/{userId}` - Leave/remove member

### Store Endpoints
- `GET /api/households/{id}/stores` - List household stores
- `POST /api/households/{id}/stores` - Add store
- `PUT /api/stores/{id}` - Update store
- `DELETE /api/stores/{id}` - Delete store
- `GET /api/stores/personal` - List personal stores

### Inventory Endpoints
- `GET /api/households/{id}/inventory` - List household inventory
- `GET /api/inventory/personal` - List personal inventory
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/{id}` - Update inventory item
- `DELETE /api/inventory/{id}` - Delete inventory item

### Trip Endpoints
- `GET /api/trips` - List trips (filtered by household context)
- `POST /api/trips` - Create trip
- `GET /api/trips/{id}` - Get trip details
- `PUT /api/trips/{id}` - Update trip
- `DELETE /api/trips/{id}` - Delete trip
- `POST /api/trips/{id}/complete` - Mark trip as completed
- `POST /api/trips/{id}/reopen` - Reopen completed trip
- `POST /api/trips/{id}/items` - Add item to trip
- `PUT /api/trips/{id}/items/{itemId}` - Update trip item
- `DELETE /api/trips/{id}/items/{itemId}` - Remove item from trip
- `POST /api/trips/{id}/items/{itemId}/check` - Check/uncheck item
- `POST /api/trips/{id}/collaborators` - Add collaborator
- `DELETE /api/trips/{id}/collaborators/{userId}` - Remove collaborator
- `GET /api/trips/{id}/events` - SSE endpoint for real-time updates

## Error Handling

### API Error Response Format
```json
{
  "errorCode": "ITEM_NOT_FOUND",
  "details": {
    "itemId": 123
  }
}
```

### Error Codes (Examples)
- `UNAUTHORIZED` - Invalid or expired token
- `VALIDATION_FAILED` - Input validation errors
- `ITEM_NOT_FOUND` - Inventory item doesn't exist
- `TRIP_NOT_FOUND` - Trip doesn't exist
- `HOUSEHOLD_NOT_FOUND` - Household doesn't exist
- `TRIP_ALREADY_COMPLETED` - Cannot edit completed trip
- `INSUFFICIENT_PERMISSIONS` - User lacks access rights
- `DUPLICATE_EMAIL` - Email already registered

### Validation Error Format
```json
{
  "errorCode": "VALIDATION_FAILED",
  "fields": {
    "name": "REQUIRED",
    "quantity": "INVALID_NUMBER"
  }
}
```

### Frontend Error Handling
- Centralized error message dictionary maps codes to user-friendly strings
- Generic fallback for unknown codes
- Toast notifications for mutations
- Inline validation on forms
- SSE reconnection handled by EventSource API (auto-retry)

## Security

### Authentication
- **Phase 1**: JWT tokens with bcrypt password hashing (work factor 12+)
- **Phase 2**: Migrate to Auth0 for managed authentication
- Access tokens expire in 15 minutes
- Refresh tokens valid for 7 days
- Auth logic isolated behind `IAuthService` interface for easy migration

### Authorization
- Users can only access households they belong to
- Users can only view/edit trips they created or are collaborators on
- Personal inventory items filtered in queries (truly private)
- Household inventory accessible only to household members
- All endpoints validate user permissions

### API Security
- HTTPS enforced by Caddy (even on TailScale)
- Rate limiting on auth endpoints
- Parameterized queries via EF Core (prevents SQL injection)
- Input validation and sanitization
- Max lengths on text fields
- No HTML in text fields (or sanitize if allowing later)

### Network Security
- API only accessible via TailScale (not public internet)
- Reduced attack surface
- HTTPS for encryption in transit

## User Interface

### Key Screens
1. **Authentication** - Login/register forms
2. **Home/Dashboard** - Active trips, quick "New Trip" access
3. **Household Selector** - Switch between households
4. **Inventory Management** - View/edit household + personal items
5. **Trip Builder** - Select items, set quantities, assign stores
6. **Active Trip View** - Items grouped by store, real-time updates
7. **Trip History** - Completed trips, click to view/reopen
8. **Household Settings** - Manage members, stores, invitations

### Mobile-First Design
- Bottom navigation for main actions
- Large tap targets for in-store use
- Swipe gestures for checking items
- Add to home screen prompt
- Service worker caches static assets for fast loading
- TanStack Query caches API responses

### Real-Time UX
- Show indicators of active collaborators
- Smooth animations for item updates (not jarring)
- Optimistic updates for responsive feel (rollback on failure)

### Offline Behavior
- PWA caches static assets (app loads even on slow connection)
- TanStack Query caches previously loaded data
- Show friendly error if API unreachable
- No mutation queuing (requires TailScale connectivity)

## Testing Strategy

### Backend Tests
- Unit tests for business logic
- Integration tests for API endpoints (in-memory database)
- Test authorization rules (data isolation)
- Test SSE event broadcasting

### Frontend Tests
- Component tests for key UI
- Test user flows (create trip, check items, share)
- Mock API responses
- Test error handling and edge cases

### Manual Testing
- Multi-device testing (real-time sync verification)
- TailScale connectivity
- PWA installation
- Key scenarios:
  - Household creation and member invitation
  - Shared trip collaboration
  - Personal item privacy in shared trips
  - Store reassignment during shopping
  - Trip completion and reopening

## Deployment

### Docker Setup
- Multi-stage Dockerfile for API
- SQLite database file as Docker volume
- Environment variables for configuration
- Docker Compose orchestrates services

### Caddy Configuration
- Reverse proxy to API
- Serves PWA static files
- HTTPS with automatic certificate management
- Accessible via TailScale IP

### Database
- SQLite single-file database
- Simple file-based backups (cron job)
- EF Core migrations run on startup

### Updates
- Pull new Docker image
- Restart containers
- Migrations apply automatically

## Future Enhancements (Post-MVP)

- Auth0 migration
- Price tracking per item
- Shopping budgets per trip
- Multiple shopping lists per household (weekly, monthly, etc.)
- Recipe integration (optional, not forced)
- Barcode scanning for adding items
- Share trip summaries (total cost, duration)
- Notification when collaborators check items
- Dark mode

## Open Questions / Decisions Needed

- Household deletion rules when last member leaves
- Store deletion behavior (require reassignment? orphan items?)
- Maximum quantities for items (validation limits)
- Trip auto-archival after X days of inactivity
- Email notification preferences for invites/updates
