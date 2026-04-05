import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://bwz7qdx8-8090.inc1.devtunnels.ms';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

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

        // Authenticate with userId
        this.socket?.emit('authenticate', { userId }, (response: any) => {
          console.log('Authentication response:', response);
          
          // Join ride room if rideId provided
          if (rideId && response.success) {
            this.joinRide(rideId);
          }
          
          resolve();
        });
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
      console.error('Cannot join ride: Socket not connected');
      return;
    }

    console.log('Joining ride room:', rideId);
    
    this.socket.emit('joinRide', { rideId }, (response: any) => {
      if (response?.success) {
        console.log('✅ Successfully joined ride room:', rideId);
      } else {
        console.error('❌ Failed to join ride room:', response?.error);
      }
    });
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

    this.socket.emit('locationUpdate', data, (response: any) => {
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
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  }) => void): void {
    if (!this.socket) return;

    this.socket.on('riderLocationUpdate', callback);
    console.log('📡 Listening for rider location updates');
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
    this.socket.off('riderLocationUpdate');
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
