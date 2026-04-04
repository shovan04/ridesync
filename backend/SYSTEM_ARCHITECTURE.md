# System Architecture - Real-Time Location Tracking

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT DEVICES                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Rider 1  │  │ Rider 2  │  │ Rider 3  │  │ Rider 4  │      │
│  │ (Mobile) │  │ (Mobile) │  │ (Mobile) │  │ (Mobile) │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │ WebSocket   │ WebSocket   │ WebSocket   │ WebSocket   │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┘
        │             │             │             │
        └─────────────┴──────┬──────┴─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer  │ (Optional)
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌──────▼─────────┐  ┌──────▼────────┐
│  Server Node 1 │  │  Server Node 2 │  │  Server Node N │
│                │  │                │  │                │
│ ┌────────────┐ │  │ ┌────────────┐ │  │ ┌────────────┐ │
│ │ Socket.IO  │ │  │ │ Socket.IO  │ │  │ │ Socket.IO  │ │
│ │  Server    │ │  │ │  Server    │ │  │ │  Server    │ │
│ └──────┬─────┘ │  │ └──────┬─────┘ │  │ └──────┬─────┘ │
│        │       │  │        │       │  │        │       │
│ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │
│ │   State    │ │  │ │   State    │ │  │ │   State    │ │
│ │  Manager   │ │  │ │  Manager   │ │  │ │  Manager   │ │
│ └──────┬─────┘ │  │ └──────┬─────┘ │  │ └──────┬─────┘ │
│        │       │  │        │       │  │        │       │
│ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │
│ │   Redis    │◄├──┼─┤   Redis    │◄├──┼─┤   Redis    │ │
│ │ Publisher  │ │  │ │ Publisher  │ │  │ │ Publisher  │ │
│ └──────┬─────┘ │  │ └──────┬─────┘ │  │ └──────┬─────┘ │
│        │       │  │        │       │  │        │       │
│ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │  │ ┌──────▼─────┐ │
│ │   Redis    │ │  │ │   Redis    │ │  │ │   Redis    │ │
│ │ Subscriber │ │  │ │ Subscriber │ │  │ │ Subscriber │ │
│ └────────────┘ │  │ └────────────┘ │  │ └────────────┘ │
└────────────────┘  └────────────────┘  └────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Redis Server  │
                    │   (Pub/Sub)     │
                    └─────────────────┘
```

## Data Flow

### 1. Connection & Join Flow

```
Client                          Server                         Redis
  │                               │                              │
  │── Connect (WebSocket) ──────►│                              │
  │                               │                              │
  │── ride:join ────────────────►│                              │
  │   {rideId, userId}           │                              │
  │                               │── Initialize state ────────►│
  │                               │                              │
  │◄── location:initialState ───│                              │
  │   {riders: [...]}            │                              │
  │                               │                              │
  │── Join Room (rideId) ──────►│                              │
```

### 2. Location Update Flow

```
Client A                        Server                         Redis
  │                               │                              │
  │── location:update ──────────►│                              │
  │   {lat, lng, speed}          │                              │
  │                               │── Validate & Throttle ─────►│
  │                               │                              │
  │                               │── Update State ────────────►│
  │                               │                              │
  │                               │── Publish ─────────────────►│
  │                               │   ride-location channel      │
  │                               │                              │
  │                               │◄── Subscribe ──────────────│
  │                               │   (All servers)              │
  │                               │                              │
  │◄── location:broadcast ──────│                              │
  │   (To all in room)           │                              │
  │                               │                              │
Client B                        Server                         Redis
  │                               │                              │
  │◄── location:broadcast ──────│                              │
  │   (From other server)        │                              │
```

### 3. Gap Detection Flow

```
Timer (10s)                  Gap Detector                 State Manager
  │                               │                              │
  │── Trigger ──────────────────►│                              │
  │                               │                              │
  │                               │── Get All Rides ──────────►│
  │                               │                              │
  │                               │◄── Return States ──────────│
  │                               │                              │
  │                               │── Calculate Distances       │
  │                               │                              │
  │                               │── Detect Gaps (>500m)       │
  │                               │                              │
  │                               │── Emit gap:alert ─────────►│
  │                               │   (To affected rides)        │
```

### 4. Disconnection Flow

```
Client                          Server                         Redis
  │                               │                              │
  │── Disconnect ───────────────►│                              │
  │   (or timeout)               │                              │
  │                               │── Remove from state ──────►│
  │                               │                              │
  │                               │── Publish ─────────────────►│
  │                               │   user_left event            │
  │                               │                              │
  │                               │◄── Broadcast ──────────────│
  │                               │   (To all servers)           │
  │                               │                              │
  │◄── user:left ───────────────│                              │
  │   (To room members)          │                              │
```

## Service Interactions

```
┌──────────────────────────────────────────────────────────┐
│                   Express Application                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              SocketServer (Singleton)               │ │
│  │                                                     │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │ Socket.IO    │  │ HTTP Server  │               │ │
│  │  │  Server      │◄─┤  (Express)   │               │ │
│  │  └──────┬───────┘  └──────────────┘               │ │
│  │         │                                          │ │
│  │  ┌──────▼───────────────────────────────┐         │ │
│  │  │      Event Handlers Module            │         │ │
│  │  │                                       │         │ │
│  │  │  • ride:join handler                  │         │ │
│  │  │  • location:update handler            │         │ │
│  │  │  • ride:leave handler                 │         │ │
│  │  │  • disconnect handler                 │         │ │
│  │  └──────┬────────────────┬──────────────┘         │ │
│  │         │                │                        │ │
│  │  ┌──────▼───────┐  ┌────▼──────────────┐         │ │
│  │  │ RideState    │  │ RedisPubSub       │         │ │
│  │  │ Service      │  │ Service           │         │ │
│  │  │ (In-Memory)  │  │ (ioredis)         │         │ │
│  │  └──────────────┘  └────────┬──────────┘         │ │
│  │                             │                    │ │
│  │  ┌──────────────────────────▼──────────┐         │ │
│  │  │    GapDetection Service             │         │ │
│  │  │    (Periodic checks)                │         │ │
│  │  └─────────────────────────────────────┘         │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

## State Management Strategy

### In-Memory State (Per Server Instance)

```typescript
{
  "ride-abc-123": {
    "user-1": {
      userId: "user-1",
      lat: 40.7128,
      lng: -74.0060,
      speed: 45.5,
      heading: 180,
      ts: 1234567890,
      lastUpdate: 1234567890
    },
    "user-2": { ... },
    "user-3": { ... }
  },
  "ride-def-456": { ... }
}
```

### Redis Pub/Sub Messages

**Location Update:**
```json
{
  "type": "location_update",
  "data": {
    "userId": "user-1",
    "rideId": "ride-abc-123",
    "lat": 40.7128,
    "lng": -74.0060,
    "speed": 45.5,
    "heading": 180,
    "ts": 1234567890
  }
}
```

**User Left:**
```json
{
  "type": "user_left",
  "data": {
    "userId": "user-1",
    "rideId": "ride-abc-123"
  }
}
```

## Scaling Characteristics

| Aspect | Single Server | Multi-Server (with Redis) |
|--------|--------------|---------------------------|
| Max Concurrent Users | ~10,000 | Unlimited (horizontal) |
| State Consistency | Perfect | Eventual (<100ms) |
| Complexity | Low | Medium |
| Failure Recovery | Restart | Auto-reconnect |
| Cost | $ | $$ |

## Performance Targets

- **Connection Time**: <100ms
- **Location Broadcast Latency**: <200ms (single server), <300ms (multi-server)
- **Gap Detection Delay**: <10s (periodic check interval)
- **Stale User Cleanup**: Every 15s
- **Memory per Ride**: ~1KB per rider
- **Max Rides per Server**: ~10,000 active rides
- **Message Throughput**: ~5,000 updates/second/server

## Security Layers

```
┌─────────────────────────────────────┐
│  Layer 1: Transport Security        │
│  • WSS (WebSocket Secure)           │
│  • TLS/SSL certificates             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 2: Authentication            │
│  • JWT token validation             │
│  • Socket handshake auth            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 3: Authorization             │
│  • Ride membership verification     │
│  • User ID validation               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 4: Rate Limiting             │
│  • Throttle (4s minimum)            │
│  • Movement filter (10m minimum)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Layer 5: Input Validation          │
│  • Coordinate range checks          │
│  • Type validation                  │
│  • Sanitization                     │
└─────────────────────────────────────┘
```

## Monitoring Metrics

Track these in production:

1. **Connected Clients**: Total WebSocket connections
2. **Active Rides**: Rides with ≥1 participant
3. **Updates/Second**: Location update throughput
4. **Broadcast Latency**: Time from receive to broadcast
5. **Redis Lag**: Pub/Sub message delay
6. **Gap Alerts**: Frequency of separation warnings
7. **Error Rate**: Failed updates/connections
8. **Memory Usage**: In-memory state size
9. **Stale Users**: Users not updated in >15s
10. **Room Sizes**: Distribution of riders per ride

---

**Built for hackathon speed, designed for production scale** 🚀
