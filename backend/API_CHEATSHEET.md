# RideSync API Quick Reference

## Base URL
```
http://localhost:8090/api/v1
```

---

## REST Endpoints

### Users
```bash
# Create User
POST /user/
Body: { name, age, email, phone, emergencyContact, address, bloodGroup, gender }

# Get User Profile
GET /user/:userId
```

### Rides
```bash
# Create Ride
POST /rides/
Body: { userId, startPoint, endPoint }

# Join Ride (max 4 participants)
POST /rides/join
Body: { userId, rideCode }
```

### Ride Stops
```bash
# Add Stop
POST /rides/stops
Body: { rideId, title, stopType, stopPoint, latitude, longitude, stopOrder }

# Get All Stops
GET /rides/:rideId/stops

# Delete Stop
DELETE /rides/stops/:stopId
```

---

## WebSocket Events

**Connect:** `ws://localhost:8090`

### Send (Client → Server)
```javascript
// Join ride
socket.emit('ride:join', { rideId, userId })

// Update location (every 5s)
socket.emit('location:update', { lat, lng, speed?, heading? })

// Leave ride
socket.emit('ride:leave', { rideId })
```

### Receive (Server → Client)
```javascript
// Initial rider locations
socket.on('location:initialState', data => {})

// Live location updates
socket.on('location:broadcast', data => {})

// Gap warning (>500m)
socket.on('gap:alert', data => {})

// Rider disconnected
socket.on('user:left', data => {})

// Errors
socket.on('error', data => {})
```

---

## Request Body Examples

### Create User
```json
{
  "name": "John Doe",
  "age": 25,
  "email": "john@example.com",
  "phone": "+1234567890",
  "emergencyContact": "+0987654321",
  "address": "123 Main St",
  "bloodGroup": "O+",
  "gender": "male"
}
```

### Create Ride
```json
{
  "userId": "user-uuid-here",
  "startPoint": "Starting Point",
  "endPoint": "Destination"
}
```

### Join Ride
```json
{
  "userId": "user-uuid-here",
  "rideCode": "ABC123"
}
```

### Add Ride Stop
```json
{
  "rideId": "ride-uuid-here",
  "title": "Shell Gas Station",
  "stopType": "fuel",
  "stopPoint": "123 Main St",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "stopOrder": 1
}
```

**Stop Types:** `fuel` | `food` | `rest` | `tea` | `other`

### Location Update
```json
{
  "lat": 40.7128,
  "lng": -74.0060,
  "speed": 45.5,
  "heading": 180,
  "accuracy": 10
}
```

---

## Response Format

### Success
```json
{
  "status": true,
  "message": "Success message",
  "data": { ... }
}
```

### Error
```json
{
  "status": false,
  "message": "ERROR_CODE",
  "data": {
    "status": 400,
    "apiPath": "/api/v1/endpoint",
    "message": "Error details",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## Key Constraints

- ✅ Max **4 participants** per ride (1 marshal + 3 riders)
- ✅ Location updates throttled to **4 seconds**
- ✅ Minimum **10 meters** movement to broadcast
- ✅ Gap alerts at **500 meters** separation
- ✅ Stop order must be **unique** per ride
- ✅ Coordinates: lat (-90 to 90), lng (-180 to 180)

---

## cURL Quick Tests

```bash
# Create User
curl -X POST http://localhost:8090/api/v1/user/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","age":25,"email":"test@test.com","phone":"123","emergencyContact":"456","address":"Addr","bloodGroup":"O+","gender":"male"}'

# Create Ride
curl -X POST http://localhost:8090/api/v1/rides/ \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-id","startPoint":"A","endPoint":"B"}'

# Add Stop
curl -X POST http://localhost:8090/api/v1/rides/stops \
  -H "Content-Type: application/json" \
  -d '{"rideId":"ride-id","title":"Gas","stopType":"fuel","stopPoint":"Loc","latitude":40.7,"longitude":-74.0,"stopOrder":1}'

# Get Stops
curl http://localhost:8090/api/v1/rides/ride-id/stops
```

---

**Full docs:** [API_REFERENCE.md](./API_REFERENCE.md)
