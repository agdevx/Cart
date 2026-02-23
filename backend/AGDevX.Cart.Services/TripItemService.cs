// ABOUTME: Service implementation for TripItem business logic including add, update, delete operations
// ABOUTME: and check/uncheck functionality with authorization checks ensuring user is trip collaborator
using System.Text.Json;
using System.Text.Json.Serialization;
using AGDevX.Cart.Shared.Models;
using AGDevX.Cart.Data.Repositories;

namespace AGDevX.Cart.Services;

public class TripItemService(ITripItemRepository tripItemRepository, ITripRepository tripRepository, ITripEventService tripEventService) : ITripItemService
{
    private readonly ITripItemRepository _tripItemRepository = tripItemRepository;
    private readonly ITripRepository _tripRepository = tripRepository;
    private readonly ITripEventService _tripEventService = tripEventService;

    //== Serializer options that handle EF Core circular navigation properties
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };
    public async Task<TripItem> AddTripItemAsync(Guid tripId, Guid inventoryItemId, int quantity, Guid userId, string? notes = null, Guid? storeId = null)
    {
        //== Verify user is collaborator before adding item to trip
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        //== Create new trip item with provided details
        var tripItem = new TripItem
        {
            TripId = tripId,
            InventoryItemId = inventoryItemId,
            Quantity = quantity,
            Notes = notes,
            StoreId = storeId,
            IsChecked = false,
            CheckedAt = null,
        };

        var created = await _tripItemRepository.CreateAsync(tripItem);

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

    public async Task<IEnumerable<TripItem>> GetTripItemsAsync(Guid tripId, Guid userId)
    {
        //== Verify user is collaborator before retrieving trip items
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return await _tripItemRepository.GetTripItemsAsync(tripId);
    }

    public async Task<TripItem?> GetByIdAsync(Guid id, Guid userId)
    {
        var tripItem = await _tripItemRepository.GetByIdAsync(id);
        if (tripItem == null)
        {
            return null;
        }

        //== Verify user is collaborator before retrieving trip item
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        return tripItem;
    }

    public async Task<TripItem> UpdateTripItemAsync(Guid id, int quantity, Guid userId, string? notes = null, Guid? storeId = null)
    {
        var tripItem = await _tripItemRepository.GetByIdAsync(id);
        if (tripItem == null)
        {
            throw new KeyNotFoundException("Trip item not found");
        }

        //== Verify user is collaborator before updating trip item
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        //== Update trip item properties
        tripItem.Quantity = quantity;
        tripItem.Notes = notes;
        tripItem.StoreId = storeId;

        var updated = await _tripItemRepository.UpdateAsync(tripItem);

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

    public async Task DeleteTripItemAsync(Guid id, Guid userId)
    {
        var tripItem = await _tripItemRepository.GetByIdAsync(id);
        if (tripItem == null)
        {
            throw new KeyNotFoundException("Trip item not found");
        }

        //== Verify user is collaborator before deleting trip item
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
        if (!isCollaborator)
        {
            throw new UnauthorizedAccessException("User is not a collaborator on this trip");
        }

        await _tripItemRepository.DeleteAsync(id);

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

    public async Task<TripItem> CheckItemAsync(Guid id, bool isChecked, Guid userId)
    {
        var tripItem = await _tripItemRepository.GetByIdAsync(id);
        if (tripItem == null)
        {
            throw new KeyNotFoundException("Trip item not found");
        }

        //== Verify user is collaborator before checking/unchecking trip item
        var isCollaborator = await _tripRepository.IsUserCollaboratorAsync(tripItem.TripId, userId);
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

        var updated = await _tripItemRepository.UpdateAsync(tripItem);

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
