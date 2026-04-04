# 🚀 Quick Start - Real-Time Location Tracking

## Start the Server

```bash
# 1. Start Redis (optional but recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# 2. Run the server
pnpm dev
```

## Test the System

### Option 1: Web Browser Test
Open `test-socket.html` in your browser and follow the UI instructions.

### Option 2: Multiple Terminal Test

**Terminal 1 - Rider 1:**
```bash
wscat -c ws://localhost:8090
```
```json
{"event": "ride:join", "data": {"rideId": "test-ride", "userId": "rider-1"}}
{"event": "location:update", "data": {"lat": 40.7128, "lng": -74.0060}}
```

**Terminal 2 - Rider 2:**
```bash
wscat -c ws://localhost:8090
```
```json
{"event": "ride:join", "data": {"rideId": "test-ride", "userId": "rider-2"}}
```

You should see Rider 1's location broadcast to Rider 2!

## Key Files

- **Main Integration**: `src/bin/app.ts` - Socket.IO integrated with Express
- **Event Handlers**: `src/services/location/socket.handlers.ts` - All socket events
- **Type Definitions**: `src/types/socket.types.ts` - TypeScript interfaces
- **Full Documentation**: `REALTIME_TRACKING.md` - Complete guide

## Events Cheat Sheet

### Client → Server
```typescript
// Join ride
socket.emit('ride:join', { rideId, userId })

// Send location
socket.emit('location:update', { lat, lng, speed?, heading? })

// Leave ride
socket.emit('ride:leave', { rideId })
```

### Server → Client
```typescript
// Initial state on join
socket.on('location:initialState', data => {})

// Location broadcasts
socket.on('location:broadcast', data => {})

// Gap alerts (>500m)
socket.on('gap:alert', data => {})

// User left
socket.on('user:left', data => {})
```

## Configuration

Edit `.env`:
```env
SOCKET_CORS_ORIGIN=http://localhost:3000  # Frontend URL
REDIS_URL=redis://localhost:6379           # Redis (optional)
```

## Troubleshooting

**Can't connect?**
- Check server is running: `pnpm dev`
- Verify port: `http://localhost:8090`
- Check CORS settings in `.env`

**No broadcasts?**
- Ensure both users joined same `rideId`
- Check Redis is running (if using multi-server)
- Look for console errors

**High latency?**
- Reduce update frequency (>4s recommended)
- Check network connection
- Monitor server load

## Next Steps

1. Read full documentation: `REALTIME_TRACKING.md`
2. Integrate into your mobile app using the client examples
3. Add authentication middleware for production
4. Set up monitoring and health checks

Happy tracking! 🏍️📡
