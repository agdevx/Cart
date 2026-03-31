// ABOUTME: Service implementation for TripItem business logic including add, update, delete operations
// ABOUTME: and check/uncheck functionality with scope-based authorization via HasTripAccess
using System.Text.Json;
using System.Text.Json.Serialization;
using AGDevX.Cart.Data;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripItemService(ITripItemRepository tripItemRepository, ITripRepository tripRepository, ITripEventService tripEventService, IInventoryRepository inventoryRepository, IStoreRepository storeRepository, CartDbContext dbContext) : ITripItemService
{
    private readonly ITripItemRepository _tripItemRepository = tripItemRepository;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly ITripEventService _tripEventService = tripEventService;
    private readonly IInventoryRepository _inventoryRepository = inventoryRepository;
    private readonly IStoreRepository _storeRepository = storeRepository;
    private readonly CartDbContext _dbContext = dbContext;

    //== Serializer options that handle EF Core circular navigation properties
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public async Task<TripItem> AddTripItem(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before adding item to trip
        await VerifyTripAccess(tripId, userId, cancellationToken);

        //== Lookup inventory item to populate denormalized name
        var inventoryItem = await _inventoryRepository.GetById(inventoryItemId, cancellationToken)
            ?? throw new ArgumentException("Inventory item not found");

        //== Lookup store name if a store is specified
        string? storeName = null;
        if (storeId.HasValue)
        {
            var store = await _storeRepository.GetById(storeId.Value, cancellationToken);
            storeName = store?.Name;
        }

        //== Create new trip item with provided details
        var tripItem = new TripItem
        {
            TripId = tripId,
            InventoryItemId = inventoryItemId,
            ItemName = inventoryItem.Name,
            StoreName = storeName,
            Quantity = quantity,
            Notes = notes,
            StoreId = storeId,
            IsChecked = false,
            CheckedAt = null,
            IsHouseholdItem = inventoryItem.HouseholdId.HasValue,
        };

        var created = await _tripItemRepository.Create(tripItem, cancellationToken);

        //== Broadcast ItemAdded event to connected clients
        _tripEventService.PublishEvent(new TripEvent
        {
            TripId = tripId,
            EventType = "ItemAdded",
            TripItemId = created.Id,
            Data = JsonSerializer.Serialize(created, _jsonOptions),
            Timestamp = DateTime.UtcNow
        });

        return created;
    }

    public async Task<IEnumerable<TripItem>> GetTripItems(Guid tripId, Guid userId, CancellationToken cancellationToken = default)
    {
        //== Verify user has access before retrieving trip items
        await VerifyTripAccess(tripId, userId, cancellationToken);

        var items = await _tripItemRepository.GetTripItems(tripId, cancellationToken);
        var trip = await _tripRepository.GetById(tripId, cancellationToken);

        //== Household trip: filter out personal items not created by this user
        if (trip?.HouseholdId != null)
        {
            items = items.Where(ti => ti.IsHouseholdItem || ti.CreatedBy == userId).ToList();
        }

        return items;
    }

    public async Task<TripItem?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken);
        if (tripItem == null)
        {
            return null;
        }

        //== Verify user has access before retrieving trip item
        await VerifyTripAccess(tripItem.TripId, userId, cancellationToken);

        return tripItem;
    }

    public async Task<TripItem> UpdateTripItem(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken)
                            ?? throw new KeyNotFoundException("Trip item not found");

        //== Verify user has access before updating trip item
        await VerifyTripAccess(tripItem.TripId, userId, cancellationToken);

        //== Update trip item properties
        tripItem.Quantity = quantity;
        tripItem.Notes = notes;
        tripItem.StoreId = storeId;

        //== Update denormalized StoreName to match new store
        if (storeId.HasValue)
        {
            var store = await _storeRepository.GetById(storeId.Value, cancellationToken);
            tripItem.StoreName = store?.Name;
        }
        else
        {
            tripItem.StoreName = null;
        }

        var updated = await _tripItemRepository.Update(tripItem, cancellationToken);

        //== Broadcast ItemUpdated event to connected clients
        _tripEventService.PublishEvent(new TripEvent
        {
            TripId = tripItem.TripId,
            EventType = "ItemUpdated",
            TripItemId = updated.Id,
            Data = JsonSerializer.Serialize(updated, _jsonOptions),
            Timestamp = DateTime.UtcNow
        });

        return updated;
    }

    public async Task DeleteTripItem(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken)
                            ?? throw new KeyNotFoundException("Trip item not found");

        //== Verify user has access before deleting trip item
        await VerifyTripAccess(tripItem.TripId, userId, cancellationToken);

        await _tripItemRepository.Delete(id, cancellationToken);

        //== Broadcast ItemRemoved event to connected clients
        _tripEventService.PublishEvent(new TripEvent
        {
            TripId = tripItem.TripId,
            EventType = "ItemRemoved",
            TripItemId = id,
            Data = JsonSerializer.Serialize(new { id, tripId = tripItem.TripId }),
            Timestamp = DateTime.UtcNow
        });
    }

    public async Task<TripItem> CheckItem(Guid id, bool isChecked, Guid userId, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken)
                            ?? throw new KeyNotFoundException("Trip item not found");

        //== Verify user has access before checking/unchecking trip item
        await VerifyTripAccess(tripItem.TripId, userId, cancellationToken);

        //== Set IsChecked and CheckedAt based on isChecked parameter
        if (isChecked)
        {
            tripItem.IsChecked = true;
            tripItem.CheckedAt = DateTime.UtcNow;
        }
        else
        {
            tripItem.IsChecked = false;
            tripItem.CheckedAt = null;
        }

        var updated = await _tripItemRepository.Update(tripItem, cancellationToken);

        //== Broadcast ItemChecked event to connected clients
        _tripEventService.PublishEvent(new TripEvent
        {
            TripId = tripItem.TripId,
            EventType = "ItemChecked",
            TripItemId = id,
            Data = JsonSerializer.Serialize(new { isChecked, checkedAt = tripItem.CheckedAt }),
            Timestamp = DateTime.UtcNow
        });

        return updated;
    }

    private async Task VerifyTripAccess(Guid tripId, Guid userId, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found");

        var hasAccess = await _tripRepository.HasTripAccess(tripId, userId, user.HouseholdId, cancellationToken);

        if (!hasAccess)
        {
            throw new UnauthorizedAccessException("User does not have access to this trip");
        }
    }
}
