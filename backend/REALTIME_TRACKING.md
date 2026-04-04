# RideSync Real-Time Location Tracking System

## 📡 Overview

A production-ready, scalable real-time location tracking and broadcast system for group rides using **Socket.IO** and **Redis Pub/Sub**.

### Key Features

✅ **Real-time GPS tracking** - Updates every 3-5 seconds  
✅ **Multi-server scalability** - Redis Pub/Sub for horizontal scaling  
✅ **Smart optimization** - Throttling, movement detection, stale user cleanup  
✅ **Gap detection** - Alerts when riders are >500m apart  
✅ **Room-based isolation** - Each ride has its own Socket.IO room  
✅ **Type-safe** - Full TypeScript implementation  
✅ **Graceful shutdown** - Proper cleanup on server restart  

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Rider 1   │◄───────►│              │◄───────►│   Rider 2   │
│  (Mobile)   │  WS     │  Socket.IO   │  WS     │  (Mobile)   │
└─────────────┘         │   Server     │         └─────────────┘
                        │              │
┌─────────────┐         │  + Redis     │         ┌─────────────┐
│   Rider 3   │◄───────►│  Pub/Sub     │◄───────►│   Rider 4   │
│  (Mobile)   │  WS     │              │  WS     │  (Mobile)   │
└─────────────┘         └──────────────┘         └─────────────┘
                               ▲
                               │
                        ┌──────────────┐
                        │   Server 2   │ (Horizontal Scale)
                        └──────────────┘
```

---

## 📁 Folder Structure

```
src/
├── types/
│   └── socket.types.ts          # TypeScript interfaces for events
├── services/
│   └── location/
│       ├── socketServer.ts      # Socket.IO server initialization
│       ├── socket.handlers.ts   # Event handlers (join, update, leave)
│       ├── redisPubSub.service.ts  # Redis Pub/Sub integration
│       ├── rideState.service.ts    # In-memory state management
│       ├── gapDetection.service.ts # Gap alert system
│       └── location.utils.ts    # Validation & optimization utilities
└── bin/
    └── app.ts                   # Main app with Socket.IO integration
```

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js 18+ 
- Redis server (for multi-server mode)
- PostgreSQL (existing requirement)

### 2. Install Dependencies

Already installed:
```bash
pnpm add socket.io ioredis geolib
```

### 3. Environment Variables

Add to `.env`:
```env
# Existing vars
PORT=8090
HOST=localhost
DATABASE_URL=...

# Socket.IO Configuration
SOCKET_CORS_ORIGIN=http://localhost:3000  # Your frontend URL

# Redis Configuration (optional for single-server)
REDIS_URL=redis://localhost:6379
```

### 4. Start Redis (Optional but Recommended)

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally
brew install redis
brew services start redis
```

### 5. Run the Server

```bash
pnpm dev
```

You should see:
```
🚀 Server is running at http://localhost:8090/api/v1
📡 Socket.IO server ready on ws://localhost:8090
✅ Socket.IO server configured
✅ Redis Pub/Sub connected successfully
✅ Subscribed to Redis channel: ride-location
✅ Gap detection service initialized
✅ Socket event handlers registered
```

---

## 📡 Client Integration

### JavaScript/TypeScript Client Example

```typescript
import { io, Socket } from 'socket.io-client';

// Connect to Socket.IO server
const socket: Socket = io('http://localhost:8090', {
  transports: ['websocket', 'polling'],
});

// Handle connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

// Join a ride
socket.emit('ride:join', {
  rideId: 'ride-uuid-here',
  userId: 'user-uuid-here',
});

// Receive initial state (current rider locations)
socket.on('location:initialState', (data) => {
  console.log('Initial state:', data);
  // data.riders contains array of current rider locations
});

// Send location updates every 5 seconds
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('location:update', {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed, // optional
      heading: position.coords.heading, // optional
      accuracy: position.coords.accuracy, // optional
    });
  });
}, 5000);

// Receive location broadcasts from other riders
socket.on('location:broadcast', (data) => {
  console.log(`Rider ${data.userId} at (${data.lat}, ${data.lng})`);
  // Update map marker for this rider
});

// Handle gap alerts
socket.on('gap:alert', (data) => {
  console.warn(`⚠️ Gap detected: ${data.distance.toFixed(0)}m between riders`);
  // Show warning UI
});

// Handle user leaving
socket.on('user:left', (data) => {
  console.log(`User ${data.userId} left ride ${data.rideId}`);
  // Remove rider from map
});

// Handle errors
socket.on('error', (data) => {
  console.error('Socket error:', data.message);
});

// Leave ride (optional, happens automatically on disconnect)
socket.emit('ride:leave', {
  rideId: 'ride-uuid-here',
});

// Disconnect
socket.disconnect();
```

### React Hook Example

```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useRideTracking(rideId: string, userId: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect
    socketRef.current = io('http://localhost:8090');

    // Join ride
    socketRef.current.emit('ride:join', { rideId, userId });

    // Listen for broadcasts
    socketRef.current.on('location:broadcast', (data) => {
      // Update state/map
      console.log('Location update:', data);
    });

    // Cleanup
    return () => {
      socketRef.current?.disconnect();
    };
  }, [rideId, userId]);

  const sendLocation = (lat: number, lng: number) => {
    socketRef.current?.emit('location:update', { lat, lng });
  };

  return { sendLocation };
}
```

---

## 🔌 Socket Events Reference

### Client → Server Events

#### `ride:join`
Join a ride room and receive initial state.

```typescript
socket.emit('ride:join', {
  rideId: string,
  userId: string,
});
```

#### `location:update`
Send GPS location update.

```typescript
socket.emit('location:update', {
  lat: number,        // Required: Latitude (-90 to 90)
  lng: number,        // Required: Longitude (-180 to 180)
  speed?: number,     // Optional: Speed in km/h (0-300)
  heading?: number,   // Optional: Heading in degrees (0-360)
  accuracy?: number,  // Optional: Accuracy in meters
});
```

#### `ride:leave`
Leave a ride room.

```typescript
socket.emit('ride:leave', {
  rideId: string,
});
```

---

### Server → Client Events

#### `location:initialState`
Received immediately after joining a ride. Contains current locations of all active riders.

```typescript
socket.on('location:initialState', (data: {
  rideId: string;
  riders: Array<{
    userId: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    ts: number;
    lastUpdate: number;
  }>;
  marshalId?: string;
}) => {
  // Initialize map with existing riders
});
```

#### `location:broadcast`
Received when any rider in the room sends a location update.

```typescript
socket.on('location:broadcast', (data: {
  userId: string;
  rideId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  ts: number;
}) => {
  // Update rider position on map
});
```

#### `gap:alert`
Emitted when distance between any two riders exceeds 500m.

```typescript
socket.on('gap:alert', (data: {
  rideId: string;
  userId1: string;
  userId2: string;
  distance: number;     // Distance in meters
  threshold: number;    // Threshold (500m)
  timestamp: number;
}) => {
  // Show warning to users
});
```

#### `user:left`
Emitted when a rider disconnects or leaves the ride.

```typescript
socket.on('user:left', (data: {
  userId: string;
  rideId: string;
}) => {
  // Remove rider from map
});
```

#### `error`
Error messages from the server.

```typescript
socket.on('error', (data: {
  code: string;
  message: string;
}) => {
  console.error(`${data.code}: ${data.message}`);
});
```

---

## ⚙️ Configuration

### Location Optimization Settings

Located in `src/services/location/location.utils.ts`:

```typescript
export const LOCATION_CONFIG = {
  MIN_MOVEMENT_METERS: 10,      // Ignore updates < 10m movement
  UPDATE_THROTTLE_MS: 4000,     // Throttle to 4 seconds
  STALE_THRESHOLD_MS: 15000,    // Mark stale after 15s
  GAP_ALERT_THRESHOLD_METERS: 500, // Alert if > 500m apart
  MAX_LOCATION_AGE_MS: 30000,   // Max age 30 seconds
};
```

### Socket.IO Configuration

Located in `src/services/location/socketServer.ts`:

```typescript
{
  cors: { origin: '*' },
  pingTimeout: 60000,      // 60s timeout
  pingInterval: 25000,     // 25s ping
  maxHttpBufferSize: 1e6,  // 1 MB
  transports: ['websocket', 'polling'],
}
```

---

## 🧪 Testing

### Manual Test with curl/wscat

Install wscat:
```bash
npm install -g wscat
```

Test connection:
```bash
wscat -c ws://localhost:8090
```

Send join event:
```json
{"event": "ride:join", "data": {"rideId": "test-ride", "userId": "user-1"}}
```

Send location:
```json
{"event": "location:update", "data": {"lat": 40.7128, "lng": -74.0060}}
```

---

## 📊 Monitoring & Debugging

### Get Server Stats

Add this endpoint to your Express app:

```typescript
import socketServer from './services/location/socketServer.js';

app.get('/api/v1/socket/stats', async (req, res) => {
  const stats = await socketServer.getStats();
  res.json(stats);
});
```

Response:
```json
{
  "socketIO": {
    "connectedClients": 12
  },
  "redis": {
    "publisherConnected": true,
    "subscriberConnected": true,
    "channel": "ride-location"
  },
  "gapDetection": {
    "isRunning": true,
    "checkIntervalMs": 10000,
    "threshold": 500
  }
}
```

### Console Logs

The system logs important events:
- 🔌 Client connections/disconnections
- 📍 Ride joins/leaves
- 📡 Location updates
- ⚠️ Gap alerts
- ✅ Service initialization status

---

## 🔄 Scalability

### Horizontal Scaling with Redis

The system supports multiple server instances through Redis Pub/Sub:

1. **Each server instance** maintains its own in-memory state
2. **Location updates** are published to Redis channel `ride-location`
3. **All instances** receive the update via Redis subscriber
4. **Each instance** broadcasts to its connected clients in that ride room

This ensures riders connected to different server instances still receive updates from each other.

### Deployment Example

```bash
# Server 1
REDIS_URL=redis://redis-host:6379 PORT=8090 node dist/bin/app.js

# Server 2
REDIS_URL=redis://redis-host:6379 PORT=8091 node dist/bin/app.js

# Load balancer distributes WebSocket connections
```

---

## 🛡️ Error Handling

The system handles various error scenarios:

- **Invalid location data** → Returns error with validation message
- **Unauthenticated requests** → Requires joining ride first
- **Throttled updates** → Silently ignored (< 4 seconds)
- **Insignificant movement** → Silently ignored (< 10 meters)
- **Stale riders** → Automatically cleaned up (15 seconds)
- **Redis connection failure** → Falls back to single-server mode
- **Graceful shutdown** → Cleans up connections and state

---

## 🎯 Performance Optimizations

1. **Movement Detection**: Only broadcasts if rider moved > 10m
2. **Throttling**: Limits updates to once per 4 seconds
3. **Stale Cleanup**: Removes inactive riders automatically
4. **Efficient Rooms**: Socket.IO rooms isolate traffic per ride
5. **Binary Compression**: Socket.IO uses efficient binary encoding
6. **Selective Broadcasting**: Only sends to relevant ride room

---

## 🔒 Security Considerations

For production deployment:

1. **Enable CORS restrictions**:
   ```env
   SOCKET_CORS_ORIGIN=https://yourdomain.com
   ```

2. **Add authentication middleware**:
   ```typescript
   io.use((socket, next) => {
     const token = socket.handshake.auth.token;
     // Validate JWT token
     if (valid) next();
     else next(new Error('Authentication failed'));
   });
   ```

3. **Rate limiting**: Implement per-user rate limits
4. **Input validation**: Already implemented via `validateLocationUpdate()`
5. **HTTPS/WSS**: Use secure WebSocket connections in production

---

## 📝 Best Practices

### For Mobile Clients

1. **Use background location services** for continuous tracking
2. **Battery optimization**: Increase interval to 10s when battery is low
3. **Network resilience**: Reconnect automatically on disconnect
4. **Accuracy filtering**: Only send updates with accuracy < 50m

### For Backend

1. **Monitor Redis memory**: Location data is ephemeral
2. **Set up health checks**: Monitor connected clients count
3. **Log gap alerts**: Track frequent separations
4. **Scale horizontally**: Add more servers as rides increase

---

## 🐛 Troubleshooting

### Issue: Clients can't connect

**Solution**: Check CORS settings and ensure port is open
```bash
telnet localhost 8090
```

### Issue: Location updates not broadcasting

**Solution**: Check Redis connection
```bash
redis-cli ping
# Should return: PONG
```

### Issue: High memory usage

**Solution**: Check for stale riders not being cleaned up
```typescript
// Manually trigger cleanup
import rideStateService from './services/location/rideState.service.js';
const cleaned = rideStateService.cleanupStaleRiders();
console.log('Cleaned up:', cleaned);
```

---

## 📚 Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Redis Pub/Sub](https://redis.io/docs/manual/pubsub/)
- [geolib Library](https://github.com/manuelbieh/geolib)

---

## 🤝 Contributing

When adding features:
1. Maintain TypeScript type safety
2. Add proper error handling
3. Include console logging for debugging
4. Update this documentation

---

**Built with ❤️ for RideSync**
