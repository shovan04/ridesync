# Ride Stops API Documentation

## Overview

Manage planned stops during a ride (fuel, food, rest, tea, or other). Each stop includes location coordinates and is ordered by sequence.

---

## Endpoints

### 1. Add a Stop to a Ride

**POST** `/api/v1/rides/stops`

Add a new stop point to an existing ride.

#### Request Body
```json
{
  "rideId": "ride-uuid-here",
  "title": "Shell Gas Station",
  "stopType": "fuel",
  "stopPoint": "123 Main St, City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "stopOrder": 1
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rideId` | string | ✅ | UUID of the ride |
| `title` | string | ✅ | Name/title of the stop (max 60 chars) |
| `stopType` | string | ✅ | One of: `fuel`, `food`, `rest`, `tea`, `other` |
| `stopPoint` | string | ✅ | Location description (max 150 chars) |
| `latitude` | number | ✅ | Latitude coordinate (-90 to 90) |
| `longitude` | number | ✅ | Longitude coordinate (-180 to 180) |
| `stopOrder` | number | ✅ | Sequence order (unique per ride) |

#### Success Response (201 Created)
```json
{
  "status": true,
  "message": "Ride stop added successfully",
  "data": {
    "id": "stop-uuid",
    "rideId": "ride-uuid",
    "title": "Shell Gas Station",
    "stopType": "fuel",
    "stopPoint": "123 Main St, City",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "stopOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Validation failed or duplicate stop order
```json
{
  "status": false,
  "message": "ADD_STOP_FAILED",
  "data": {
    "status": 400,
    "apiPath": "/api/v1/rides/stops",
    "message": "Stop order 1 already exists for this ride",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Get All Stops for a Ride

**GET** `/api/v1/rides/:rideId/stops`

Retrieve all stops for a specific ride, ordered by `stopOrder`.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rideId` | string | ✅ | UUID of the ride |

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "Ride stops retrieved successfully",
  "data": [
    {
      "id": "stop-uuid-1",
      "rideId": "ride-uuid",
      "title": "Shell Gas Station",
      "stopType": "fuel",
      "stopPoint": "123 Main St",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "stopOrder": 1,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": "stop-uuid-2",
      "rideId": "ride-uuid",
      "title": "McDonald's",
      "stopType": "food",
      "stopPoint": "456 Oak Ave",
      "latitude": 40.7580,
      "longitude": -73.9855,
      "stopOrder": 2,
      "createdAt": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

#### Error Response (404 Not Found)
```json
{
  "status": false,
  "message": "GET_STOPS_FAILED",
  "data": {
    "status": 404,
    "apiPath": "/api/v1/rides/invalid-id/stops",
    "message": "Ride not found",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Delete a Ride Stop

**DELETE** `/api/v1/rides/stops/:stopId`

Remove a stop from a ride.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stopId` | string | ✅ | UUID of the stop to delete |

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "Ride stop deleted successfully",
  "data": {
    "id": "stop-uuid",
    "rideId": "ride-uuid",
    "title": "Shell Gas Station",
    "stopType": "fuel",
    "stopPoint": "123 Main St",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "stopOrder": 1,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "status": false,
  "message": "DELETE_STOP_FAILED",
  "data": {
    "status": 404,
    "apiPath": "/api/v1/rides/stops/invalid-id",
    "message": "Stop not found or already deleted",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Usage Examples

### cURL Examples

#### Add a Stop
```bash
curl -X POST http://localhost:8090/api/v1/rides/stops \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "abc123-def456",
    "title": "BP Gas Station",
    "stopType": "fuel",
    "stopPoint": "789 Highway 101",
    "latitude": 40.7580,
    "longitude": -73.9855,
    "stopOrder": 1
  }'
```

#### Get All Stops
```bash
curl http://localhost:8090/api/v1/rides/abc123-def456/stops
```

#### Delete a Stop
```bash
curl -X DELETE http://localhost:8090/api/v1/rides/stops/stop-uuid-here
```

---

### JavaScript/TypeScript Example

```typescript
// Add a stop
async function addRideStop(rideId: string, stopData: any) {
  const response = await fetch('http://localhost:8090/api/v1/rides/stops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rideId,
      ...stopData,
    }),
  });
  
  return await response.json();
}

// Get all stops
async function getRideStops(rideId: string) {
  const response = await fetch(`http://localhost:8090/api/v1/rides/${rideId}/stops`);
  return await response.json();
}

// Delete a stop
async function deleteRideStop(stopId: string) {
  const response = await fetch(`http://localhost:8090/api/v1/rides/stops/${stopId}`, {
    method: 'DELETE',
  });
  
  return await response.json();
}

// Usage
const result = await addRideStop('ride-uuid', {
  title: 'Coffee Break',
  stopType: 'tea',
  stopPoint: 'Starbucks Downtown',
  latitude: 40.7580,
  longitude: -73.9855,
  stopOrder: 2,
});

console.log('Stop added:', result.data);
```

---

## Stop Types

The system supports these predefined stop types:

| Type | Description | Use Case |
|------|-------------|----------|
| `fuel` | Fuel/Gas station | Refueling motorcycles |
| `food` | Restaurant/Food | Meal breaks |
| `rest` | Rest area | Rest stops, stretching |
| `tea` | Tea/Coffee shop | Short beverage breaks |
| `other` | Other | Any other type of stop |

---

## Business Rules

1. **Unique Stop Order**: Each ride cannot have duplicate `stopOrder` values
2. **Valid Coordinates**: Latitude must be -90 to 90, Longitude -180 to 180
3. **Ride Must Exist**: Cannot add stops to non-existent rides
4. **Ordered Results**: Stops are always returned sorted by `stopOrder`
5. **Soft Validation**: No automatic validation of coordinate accuracy

---

## Database Schema

```sql
CREATE TABLE ride_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id),
  title VARCHAR(60) NOT NULL,
  stop_type ENUM('fuel', 'food', 'rest', 'tea', 'other') NOT NULL,
  stop_point VARCHAR(150) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  stop_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(ride_id, stop_order)
);
```

---

## Integration with Real-Time Tracking

Ride stops can be integrated with the real-time location tracking system:

1. **Display on Map**: Show stop markers on the live tracking map
2. **Navigation**: Guide riders to upcoming stops
3. **ETA Calculation**: Calculate time to next stop
4. **Notifications**: Alert riders when approaching a stop

Example integration:
```typescript
// After receiving ride stops, display on map
const stops = await getRideStops(rideId);

stops.forEach(stop => {
  addMarkerToMap({
    lat: stop.latitude,
    lng: stop.longitude,
    title: stop.title,
    icon: getIconForStopType(stop.stopType),
  });
});
```

---

## Error Handling Tips

1. **Always validate rideId** before adding stops
2. **Check for duplicate stopOrder** to avoid conflicts
3. **Handle coordinate precision** - database stores 6 decimal places
4. **Gracefully handle missing stops** - they may have been deleted

---

## Future Enhancements

Potential improvements:
- ✏️ Update existing stops (PUT/PATCH endpoint)
- 📸 Add photos to stops
- ⏱️ Estimated arrival time at each stop
- 📝 Notes/description field for stops
- 🔔 Push notifications when approaching stops
- 🗺️ Automatic route optimization between stops

---

**Ready to use!** Test the endpoints using the examples above. 🏍️🛑
