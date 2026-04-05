import { Server, Socket } from 'socket.io';
import { 
  ClientToServerEvents, 
  ServerToClientEvents,
  SocketSession,
  BroadcastLocation,
  RedisMessage,
  RiderLocation
} from '../../types/socket.types.js';
import rideStateService from './rideState.service.js';
import redisPubSubService from './redisPubSub.service.js';
import gapDetectionService from './gapDetection.service.js';
import RideRepo from '../../repositories/ride.repo.js';
import { 
  validateLocationUpdate, 
  shouldThrottleUpdate,
  hasSignificantMovement,
  sanitizeLocation,
  LOCATION_CONFIG
} from './location.utils.js';

/**
 * Socket.IO Event Handlers for RideSync
 * Handles all real-time location tracking events
 */
export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  
  // Handle new socket connections
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Initialize socket session
    const session: SocketSession = {
      isAuthenticated: false,
    };
    socket.data.session = session;

    // Set up event handlers for this socket
    setupConnectionHandlers(socket, io, session);
  });

  console.log('✅ Socket event handlers registered');
}

/**
 * Set up individual connection event handlers
 */
function setupConnectionHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  session: SocketSession
): void {
  
  // Handle ride join
  socket.on('ride:join', async (data) => {
    try {
      console.log(`📍 User ${data.userId} joining ride ${data.rideId}`);

      // Validate data
      if (!data.userId || !data.rideId) {
        socket.emit('error', { 
          code: 'INVALID_DATA', 
          message: 'userId and rideId are required' 
        });
        return;
      }

      // Update session
      session.userId = data.userId;
      session.rideId = data.rideId;
      session.isAuthenticated = true;

      // Join the ride room
      await socket.join(data.rideId);
      console.log(`✅ Socket ${socket.id} joined room: ${data.rideId}`);

      // Get initial state with current rider locations
      const initialState = rideStateService.getInitialState(data.rideId);
      
      // Send initial state to the joining user
      socket.emit('location:initialState', initialState);

      console.log(`👥 Ride ${data.rideId} now has ${initialState.riders.length + 1} riders`);
    } catch (error) {
      console.error('Error handling ride:join:', error);
      socket.emit('error', { 
        code: 'JOIN_FAILED', 
        message: 'Failed to join ride' 
      });
    }
  });

  // Handle location updates
  socket.on('location:update', async (locationData) => {
    try {
      // Validate session
      if (!session.isAuthenticated || !session.userId || !session.rideId) {
        socket.emit('error', { 
          code: 'NOT_AUTHENTICATED', 
          message: 'Must join a ride before sending location updates' 
        });
        return;
      }

      const { userId, rideId } = session;
      const currentTime = Date.now();

      // Check if ride is active before broadcasting
      const repo = new RideRepo();
      const ride = await repo.getRideById(rideId);
      
      if (!ride) {
        socket.emit('error', { 
          code: 'RIDE_NOT_FOUND', 
          message: 'Ride not found' 
        });
        return;
      }

      if (ride.status !== 'active') {
        // Silently ignore location updates if ride hasn't started
        console.log(`⏸️ Location update ignored - ride ${rideId} not yet started (status: ${ride.status})`);
        return;
      }

      // Validate location data
      const validation = validateLocationUpdate(locationData);
      if (!validation.valid) {
        socket.emit('error', { 
          code: 'INVALID_LOCATION', 
          message: validation.error || 'Invalid location data' 
        });
        return;
      }

      // Check throttle - prevent too frequent updates
      const lastLocation = rideStateService.getRiderLocation(rideId, userId);
      if (lastLocation && shouldThrottleUpdate(lastLocation.lastUpdate, currentTime)) {
        // Silently ignore throttled updates
        return;
      }

      // Check if movement is significant (skip if < 10 meters)
      if (lastLocation && !hasSignificantMovement(lastLocation, locationData)) {
        // Silently ignore insignificant movements
        return;
      }

      // Sanitize location data
      const sanitizedLocation = sanitizeLocation(locationData);

      // Create broadcast payload
      const broadcastData: BroadcastLocation = {
        ...sanitizedLocation,
        userId,
        rideId,
        ts: currentTime,
      };

      // Update local state
      const riderLocationData: Omit<RiderLocation, 'userId' | 'lastUpdate'> = {
        lat: broadcastData.lat,
        lng: broadcastData.lng,
        ts: broadcastData.ts,
      };
      
      if (broadcastData.speed !== undefined) {
        riderLocationData.speed = broadcastData.speed;
      }
      
      if (broadcastData.heading !== undefined) {
        riderLocationData.heading = broadcastData.heading;
      }
      
      rideStateService.updateRiderLocation(rideId, userId, riderLocationData);

      // Publish to Redis for multi-server broadcast
      await redisPubSubService.publishLocationUpdate(broadcastData);

      // Trigger gap detection
      gapDetectionService.triggerGapCheck(rideId);

      // Debug log
      console.log(`📡 Location update from ${userId} in ride ${rideId}`);
    } catch (error) {
      console.error('Error handling location:update:', error);
      socket.emit('error', { 
        code: 'LOCATION_UPDATE_FAILED', 
        message: 'Failed to process location update' 
      });
    }
  });

  // Handle ride leave
  socket.on('ride:leave', async (data) => {
    try {
      if (!session.userId || !session.rideId) {
        return;
      }

      console.log(`🚪 User ${session.userId} leaving ride ${data.rideId}`);

      // Remove from state
      rideStateService.removeRider(data.rideId, session.userId);

      // Leave the room
      await socket.leave(data.rideId);

      // Notify others
      socket.to(data.rideId).emit('user:left', {
        userId: session.userId,
        rideId: data.rideId,
      });

      // Publish to Redis
      await redisPubSubService.publishUserLeft(session.userId, data.rideId);

      // Clear session
      delete session.userId;
      delete session.rideId;
      session.isAuthenticated = false;

      console.log(`✅ User ${session.userId} left ride ${data.rideId}`);
    } catch (error) {
      console.error('Error handling ride:leave:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    try {
      console.log(`🔌 Client disconnected: ${socket.id} (reason: ${reason})`);

      if (session.isAuthenticated && session.userId && session.rideId) {
        // Remove from state
        rideStateService.removeRider(session.rideId, session.userId);

        // Notify others in the room
        socket.to(session.rideId).emit('user:left', {
          userId: session.userId,
          rideId: session.rideId,
        });

        // Publish to Redis
        await redisPubSubService.publishUserLeft(session.userId, session.rideId);

        console.log(`👋 User ${session.userId} removed from ride ${session.rideId}`);
      }

      // Clear session
      delete session.userId;
      delete session.rideId;
      session.isAuthenticated = false;
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
}

/**
 * Set up Redis message handler for multi-server communication
 */
export function setupRedisHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  redisPubSubService.subscribe(async (message: RedisMessage) => {
    try {
      switch (message.type) {
        case 'location_update': {
          const { rideId, userId, ...locationData } = message.data;
          
          // Broadcast to all clients in the ride room (except sender)
          io.to(rideId).emit('location:broadcast', message.data);
          
          break;
        }

        case 'user_left': {
          const { rideId, userId } = message.data;
          
          // Notify all clients in the ride room
          io.to(rideId).emit('user:left', { userId, rideId });
          
          break;
        }

        default: {
          console.warn('Unknown Redis message type:', (message as any).type);
        }
      }
    } catch (error) {
      console.error('Error handling Redis message:', error);
    }
  });

  console.log('✅ Redis message handler registered');
}
