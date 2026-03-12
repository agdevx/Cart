// ABOUTME: Service implementation for TripItem business logic including add, update, delete operations
// ABOUTME: and check/uncheck functionality with authorization checks ensuring user is trip collaborator
using System.Text.Json;
using System.Text.Json.Serialization;
using AGDevX.Cart.Data.Models;
using AGDevX.Cart.Data.Repositories;
using AGDevX.Cart.Shared.Models;

namespace AGDevX.Cart.Services;

public class TripItemService(ITripItemRepository tripItemRepository, ITripRepository tripRepository, ITripEventService tripEventService, IInventoryRepository inventoryRepository, IStoreRepository storeRepository) : ITripItemService
{
    private readonly ITripItemRepository _tripItemRepository = tripItemRepository;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly ITripEventService _tripEventService = tripEventService;
    private readonly IInventoryRepository _inventoryRepository = inventoryRepository;
    private readonly IStoreRepository _storeRepository = storeRepository;

    //== Serializer options that handle EF Core circular navigation properties
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };
    public async Task<TripItem> AddTripItem(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default)
    {
        //== Verify user is collaborator before adding item to trip
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

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
        //== Verify user is collaborator before retrieving trip items
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return await _tripItemRepository.GetTripItems(tripId, cancellationToken);
    }

    public async Task<TripItem?> GetById(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken);
        if (tripItem == null)
        {
            return null;
        }

        //== Verify user is collaborator before retrieving trip item
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripItem.TripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return tripItem;
    }

    public async Task<TripItem> UpdateTripItem(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null, CancellationToken cancellationToken = default)
    {
        var tripItem = await _tripItemRepository.GetById(id, cancellationToken)
                            ?? throw new KeyNotFoundException("Trip item not found");

        //== Verify user is collaborator before updating trip item
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripItem.TripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

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

        //== Verify user is collaborator before deleting trip item
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripItem.TripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

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

        //== Verify user is collaborator before checking/unchecking trip item
        var isCollaborator = await _tripRepository.IsUserCollaborator(tripItem.TripId, userId, cancellationToken);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

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
}
