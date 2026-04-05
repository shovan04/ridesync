# RideSync API Documentation - Complete Reference

## Base URL
```
http://localhost:8090/api/v1
```

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [Welcome](#welcome)
3. [User Management](#user-management)
4. [Ride Management](#ride-management)
5. [Ride Stops](#ride-stops)
6. [Real-Time Location (WebSocket)](#real-time-location-websocket)

---

## Health Check

### GET `/`
Check if API is running.

**Response:**
```
API is running... Go to /hello/wellcome to see the wellcome message.
```

---

## Welcome

### GET `/hello/wellcome`
Get welcome message.

**Response (200 OK):**
```json
{
  "status": true,
  "message": "Success",
  "data": "Hello, welcome to our service!"
}
```

---

## User Management

### 1. Create User

**POST** `/user/`

Create a new user account.

#### Request Body
```json
{
  "name": "John Doe",
  "age": 25,
  "email": "john@example.com",
  "phone": "+1234567890",
  "emergencyContact": "+0987654321",
  "address": "123 Main Street, City",
  "bloodGroup": "O+",
  "gender": "male"
}
```

#### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | Non-empty string |
| `age` | number | ✅ | Valid number |
| `email` | string | ✅ | Valid email format |
| `phone` | string | ✅ | Non-empty string |
| `emergencyContact` | string | ✅ | Non-empty string |
| `address` | string | ✅ | Non-empty string |
| `bloodGroup` | string | ✅ | Non-empty string |
| `gender` | string | ✅ | Non-empty string |

#### Success Response (201 Created)
```json
{
  "status": true,
  "message": "User created successfully",
  "data": [
    {
      "id": "uuid-here",
      "name": "John Doe",
      "age": 25,
      "email": "john@example.com",
      "phone": "+1234567890",
      "emergencyContact": "+0987654321",
      "address": "123 Main Street, City",
      "bloodGroup": "O+",
      "gender": "male",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Error Response (409 Conflict)
```json
{
  "status": false,
  "message": "FAILD_CREATION",
  "data": {
    "status": 409,
    "apiPath": "/api/v1/user/",
    "message": "User already exists with the credintatils",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Get User Profile

**GET** `/user/:userId`

Retrieve user profile by ID.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string (UUID) | ✅ | User's unique identifier |

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "uuid-here",
    "name": "John Doe",
    "age": 25,
    "phone": "+1234567890",
    "email": "john@example.com",
    "emergencyContact": "+0987654321",
    "address": "123 Main Street, City",
    "bloodGroup": "O+",
    "gender": "male",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response (404 Not Found)
```json
{
  "status": false,
  "message": "USER_NOT_FOUND",
  "data": {
    "status": 404,
    "apiPath": "/api/v1/user/invalid-id",
    "message": "User not found",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Ride Management

### 1. Create Ride

**POST** `/rides/`

Create a new ride session. The creator becomes the marshal (leader).

#### Request Body
```json
{
  "userId": "user-uuid-here",
  "startPoint": "Starting Location",
  "endPoint": "Destination Location"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string (UUID) | ✅ | Creator's user ID |
| `startPoint` | string | ✅ | Starting location (max 150 chars) |
| `endPoint` | string | ✅ | Destination location (max 150 chars) |

#### Success Response (201 Created)
```json
{
  "status": true,
  "message": "Ride created successfully",
  "data": {
    "rideId": "ride-uuid",
    "userId": "user-uuid",
    "code": "ABC123",
    "role": "marshal",
    "startPoint": "Starting Location",
    "endPoint": "Destination Location"
  }
}
```

#### Error Response (400 Bad Request)
```json
{
  "status": false,
  "message": "FAILD_CREATION",
  "data": {
    "status": 400,
    "apiPath": "/api/v1/rides/",
    "message": "Error message here",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 2. Join Ride

**POST** `/rides/join`

Join an existing ride as a rider (max 4 participants including marshal).

#### Request Body
```json
{
  "userId": "user-uuid-here",
  "rideCode": "ABC123"
}
```

#### Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string (UUID) | ✅ | User's ID joining the ride |
| `rideCode` | string (6 chars) | ✅ | Ride's unique code |

#### Success Response (200 OK)
```json
{
  "status": true,
  "message": "Successfully joined the ride",
  "data": {
    "rideId": "ride-uuid",
    "rideCode": "ABC123",
    "userId": "user-uuid",
    "role": "rider",
    "startPoint": "Starting Location",
    "endPoint": "Destination Location",
    "currentParticipants": 2,
    "maxParticipants": 4
  }
}
```

#### Error Response (409 Conflict) - Ride Full
```json
{
  "status": false,
  "message": "JOIN_RIDE_FAILED",
  "data": {
    "status": 409,
    "apiPath": "/api/v1/rides/join",
    "message": "Ride is full. Maximum 4 participants allowed.",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response (409 Conflict) - Ride Not Found
```json
{
  "status": false,
  "message": "JOIN_RIDE_FAILED",
  "data": {
    "status": 409,
    "apiPath": "/api/v1/rides/join",
    "message": "Ride not found with the provided code",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Ride Stops

### 1. Add Stop to Ride

**POST** `/rides/stops`

Add a planned stop to a ride (fuel, food, rest, tea, or other).

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
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `rideId` | string (UUID) | ✅ | Must exist | Ride's UUID |
| `title` | string | ✅ | Max 60 chars | Stop name/title |
| `stopType` | string | ✅ | Enum | One of: `fuel`, `food`, `rest`, `tea`, `other` |
| `stopPoint` | string | ✅ | Max 150 chars | Location description |
| `latitude` | number | ✅ | -90 to 90 | GPS latitude |
| `longitude` | number | ✅ | -180 to 180 | GPS longitude |
| `stopOrder` | number | ✅ | Unique per ride | Sequence order |

#### Stop Types
- `fuel` - Gas/fuel station
- `food` - Restaurant/meal stop
- `rest` - Rest area/break
- `tea` - Tea/coffee shop
- `other` - Other type of stop

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

#### Error Response (400 Bad Request) - Duplicate Order
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

### 2. Get All Stops for Ride

**GET** `/rides/:rideId/stops`

Retrieve all stops for a ride, ordered by `stopOrder`.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rideId` | string (UUID) | ✅ | Ride's unique identifier |

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

### 3. Delete Ride Stop

**DELETE** `/rides/stops/:stopId`

Remove a stop from a ride.

#### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stopId` | string (UUID) | ✅ | Stop's unique identifier |

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

## Real-Time Location (WebSocket)

**Connection URL:** `ws://localhost:8090`

### Client → Server Events

#### 1. Join Ride Room
```typescript
socket.emit('ride:join', {
  rideId: 'ride-uuid-here',
  userId: 'user-uuid-here'
});
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rideId` | string | ✅ | Ride's UUID |
| `userId` | string | ✅ | User's UUID |

---

#### 2. Send Location Update
```typescript
socket.emit('location:update', {
  lat: 40.7128,
  lng: -74.0060,
  speed: 45.5,        // optional
  heading: 180,       // optional
  accuracy: 10        // optional
});
```

**Fields:**
| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `lat` | number | ✅ | -90 to 90 | Latitude |
| `lng` | number | ✅ | -180 to 180 | Longitude |
| `speed` | number | ❌ | 0-300 | Speed in km/h |
| `heading` | number | ❌ | 0-360 | Direction in degrees |
| `accuracy` | number | ❌ | >0 | GPS accuracy in meters |

**Note:** Updates are throttled to 4 seconds minimum and require 10m movement.

---

#### 3. Leave Ride Room
```typescript
socket.emit('ride:leave', {
  rideId: 'ride-uuid-here'
});
```

---

### Server → Client Events

#### 1. Initial State (on join)
```typescript
socket.on('location:initialState', (data) => {
  console.log(data);
});
```

**Response:**
```json
{
  "rideId": "ride-uuid",
  "riders": [
    {
      "userId": "user-1",
      "lat": 40.7128,
      "lng": -74.0060,
      "speed": 45.5,
      "heading": 180,
      "ts": 1234567890,
      "lastUpdate": 1234567890
    }
  ],
  "marshalId": "user-1"
}
```

---

#### 2. Location Broadcast
```typescript
socket.on('location:broadcast', (data) => {
  console.log(data);
});
```

**Response:**
```json
{
  "userId": "user-1",
  "rideId": "ride-uuid",
  "lat": 40.7128,
  "lng": -74.0060,
  "speed": 45.5,
  "heading": 180,
  "ts": 1234567890
}
```

---

#### 3. Gap Alert
Emitted when riders are >500m apart.

```typescript
socket.on('gap:alert', (data) => {
  console.warn(`Gap detected: ${data.distance}m`);
});
```

**Response:**
```json
{
  "rideId": "ride-uuid",
  "userId1": "user-1",
  "userId2": "user-2",
  "distance": 650,
  "threshold": 500,
  "timestamp": 1234567890
}
```

---

#### 4. User Left
```typescript
socket.on('user:left', (data) => {
  console.log(`${data.userId} left ${data.rideId}`);
});
```

**Response:**
```json
{
  "userId": "user-1",
  "rideId": "ride-uuid"
}
```

---

#### 5. Error
```typescript
socket.on('error', (data) => {
  console.error(data.message);
});
```

**Response:**
```json
{
  "code": "INVALID_LOCATION",
  "message": "Latitude must be between -90 and 90"
}
```

---

## 📊 Summary Table

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | Health check |
| GET | `/hello/wellcome` | ❌ | Welcome message |
| POST | `/user/` | ❌ | Create user |
| GET | `/user/:userId` | ❌ | Get user profile |
| POST | `/rides/` | ❌ | Create ride |
| POST | `/rides/join` | ❌ | Join ride |
| POST | `/rides/stops` | ❌ | Add ride stop |
| GET | `/rides/:rideId/stops` | ❌ | Get ride stops |
| DELETE | `/rides/stops/:stopId` | ❌ | Delete ride stop |
| WS | `ws://localhost:8090` | ❌ | Real-time location |

---

## 🔧 Common Response Structure

### Success Response
```json
{
  "status": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": false,
  "message": "ERROR_CODE",
  "data": {
    "status": 400,
    "apiPath": "/api/v1/endpoint",
    "message": "Human readable error",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 🎯 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, DELETE |
| 201 | Created | Successful POST (create) |
| 400 | Bad Request | Validation errors |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate data, business logic errors |
| 500 | Internal Server Error | Unexpected errors |

---

## 💡 Tips

1. **Always validate UUIDs** before sending requests
2. **Use proper stopOrder** values (1, 2, 3...) without gaps
3. **Join rides before** sending location updates via WebSocket
4. **Handle reconnection** for WebSocket connections
5. **Check participant limit** (max 4) before attempting to join
6. **Coordinates precision**: Store up to 6 decimal places (~11cm accuracy)

---

## 🚀 Quick Start Example

```javascript
// 1. Create User
const user = await fetch('http://localhost:8090/api/v1/user/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "John Doe",
    age: 25,
    email: "john@example.com",
    phone: "+1234567890",
    emergencyContact: "+0987654321",
    address: "123 Main St",
    bloodGroup: "O+",
    gender: "male"
  })
});

// 2. Create Ride
const ride = await fetch('http://localhost:8090/api/v1/rides/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user-uuid",
    startPoint: "Location A",
    endPoint: "Location B"
  })
});

// 3. Add Stop
await fetch('http://localhost:8090/api/v1/rides/stops', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rideId: "ride-uuid",
    title: "Gas Station",
    stopType: "fuel",
    stopPoint: "Shell on Main St",
    latitude: 40.7128,
    longitude: -74.0060,
    stopOrder: 1
  })
});

// 4. Connect WebSocket
const socket = io('http://localhost:8090');
socket.emit('ride:join', { rideId: 'ride-uuid', userId: 'user-uuid' });
```

---

**All endpoints are ready to use!** Test with Postman, curl, or your frontend application. 🏍️✨
