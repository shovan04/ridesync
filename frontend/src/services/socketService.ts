import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://bwz7qdx8-8090.inc1.devtunnels.ms';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private currentUserId: string | null = null;
  private currentRideId: string | null = null;

  /**
   * Initialize and connect to Socket.IO server
   */
  connect(userId: string, rideId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        resolve();
        return;
      }

      console.log('Connecting to Socket.IO server...', { userId, rideId });

      // Store user and ride info
      this.currentUserId = userId;
      this.currentRideId = rideId || null;

      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Handle connection
      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket?.id);
        this.isConnected = true;

        // Join ride room immediately (no authentication needed)
        if (rideId) {
          console.log('🚪 Auto-joining ride room after connect...');
          this.joinRide(rideId);
        }
        
        resolve();
      });

      // Handle connection error
      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      // Handle disconnection
      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
        this.isConnected = false;
      });

      // Handle reconnection
      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        this.isConnected = true;
        
        // Re-authenticate and rejoin ride
        if (userId) {
          this.socket?.emit('authenticate', { userId });
          if (rideId) {
            this.joinRide(rideId);
          }
        }
      });
    });
  }

  /**
   * Join a ride room to receive updates
   */
  joinRide(rideId: string): void {
    if (!this.socket || !this.isConnected) {
      console.error('❌ Cannot join ride: Socket not connected');
      return;
    }

    if (!this.currentUserId) {
      console.error('❌ Cannot join ride: User ID not set');
      return;
    }

    console.log('🚪 Joining ride room:', rideId);
    console.log('   - User ID:', this.currentUserId);
    
    // Backend expects 'ride:join' event with userId and rideId
    this.socket.emit('ride:join', { 
      rideId, 
      userId: this.currentUserId 
    }, (response: any) => {
      console.log('🚪 Join ride response:', response);
      if (response?.success) {
        console.log('✅ Successfully joined ride room:', rideId);
        this.currentRideId = rideId;
      } else {
        console.error('❌ Failed to join ride room:', response?.error || response);
      }
    });
  }
  
  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.currentUserId;
  }
  
  /**
   * Get current ride ID
   */
  getRideId(): string | null {
    return this.currentRideId;
  }

  /**
   * Leave a ride room
   */
  leaveRide(rideId: string): void {
    if (!this.socket) return;

    console.log('Leaving ride room:', rideId);
    this.socket.emit('leaveRide', { rideId });
  }

  /**
   * Broadcast location update (for marshal)
   */
  broadcastLocation(data: {
    rideId: string;
    userId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
  }): void {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot broadcast: Socket not connected');
      return;
    }

    // Convert field names to match backend expectations
    this.socket.emit('location:update', {
      rideId: data.rideId,
      userId: data.userId,
      lat: data.latitude,
      lng: data.longitude,
      speed: data.speed,
      heading: data.heading,
      accuracy: data.accuracy,
    }, (response: any) => {
      if (response?.error) {
        console.error('Error broadcasting location:', response.error);
      }
    });
  }

  /**
   * Listen for ride status updates
   */
  onRideStatusUpdate(callback: (data: { rideId: string; status: string }) => void): void {
    if (!this.socket) return;

    this.socket.on('rideStatusUpdate', callback);
    console.log('📡 Listening for ride status updates');
  }

  /**
   * Listen for rider location updates
   */
  onRiderLocationUpdate(callback: (data: {
    userId: string;
    rideId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp: number;
  }) => void): void {
    if (!this.socket) return;

    // Listen to the actual backend event name and transform field names
    this.socket.on('location:broadcast', (backendData: any) => {
      // Transform backend data structure to frontend expectations
      const transformedData = {
        userId: backendData.userId,
        rideId: backendData.rideId,
        latitude: backendData.lat,
        longitude: backendData.lng,
        speed: backendData.speed,
        heading: backendData.heading,
        timestamp: backendData.ts,
      };
      callback(transformedData);
    });
    console.log('📡 Listening for rider location updates (location:broadcast)');
  }

  /**
   * Listen for participant joined events
   */
  onParticipantJoined(callback: (data: {
    userId: string;
    userName: string;
    role: string;
    rideId: string;
  }) => void): void {
    if (!this.socket) return;

    this.socket.on('participantJoined', callback);
    console.log('📡 Listening for participant joined events');
  }

  /**
   * Listen for participant left events
   */
  onParticipantLeft(callback: (data: {
    userId: string;
    rideId: string;
  }) => void): void {
    if (!this.socket) return;

    this.socket.on('participantLeft', callback);
    console.log('📡 Listening for participant left events');
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (!this.socket) return;

    this.socket.off('rideStatusUpdate');
    this.socket.off('location:broadcast');
    this.socket.off('participantJoined');
    this.socket.off('participantLeft');
    console.log('🔇 Removed all socket listeners');
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if socket is connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
