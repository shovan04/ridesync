/**
 * Socket.IO Event Types for RideSync Real-Time Location Tracking
 */

// Client → Server Events
export interface ClientToServerEvents {
  // Join a ride room
  'ride:join': (data: { rideId: string; userId: string }) => void;
  
  // Send location update
  'location:update': (data: LocationUpdate) => void;
  
  // Leave ride room
  'ride:leave': (data: { rideId: string }) => void;
}

// Server → Client Events
export interface ServerToClientEvents {
  // Broadcast location to all riders in room
  'location:broadcast': (data: BroadcastLocation) => void;
  
  // Send initial state when user joins
  'location:initialState': (data: InitialStateResponse) => void;
  
  // Ride status update (e.g., ride started)
  'rideStatusUpdate': (data: { rideId: string; status: string; startedBy?: string; timestamp: string }) => void;
  
  // User disconnected from ride
  'user:left': (data: { userId: string; rideId: string }) => void;
  
  // Gap alert when riders are too far apart
  'gap:alert': (data: GapAlert) => void;
  
  // Off-route warning (placeholder)
  'route:warning': (data: { userId: string; message: string }) => void;
  
  // Error messages
  'error': (data: { code: string; message: string }) => void;
}

// Data Types
export interface LocationUpdate {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
}

export interface BroadcastLocation extends LocationUpdate {
  userId: string;
  rideId: string;
  ts: number; // timestamp
}

export interface RiderLocation {
  userId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  ts: number;
  lastUpdate: number;
}

export interface RideState {
  [userId: string]: RiderLocation;
}

export interface AllRidesState {
  [rideId: string]: RideState;
}

export interface InitialStateResponse {
  rideId: string;
  riders: RiderLocation[];
  marshalId?: string;
}

export interface GapAlert {
  rideId: string;
  userId1: string;
  userId2: string;
  distance: number; // in meters
  threshold: number; // in meters
  timestamp: number;
}

// Redis Pub/Sub Message
export interface RedisLocationMessage {
  type: 'location_update';
  data: BroadcastLocation;
}

export interface RedisUserLeftMessage {
  type: 'user_left';
  data: {
    userId: string;
    rideId: string;
  };
}

export type RedisMessage = RedisLocationMessage | RedisUserLeftMessage;

// Socket Session Data
export interface SocketSession {
  userId?: string;
  rideId?: string;
  isAuthenticated: boolean;
}
