import { 
  AllRidesState, 
  RiderLocation, 
  RideState,
  InitialStateResponse 
} from '../../types/socket.types.js';
import { isLocationStale } from './location.utils.js';

/**
 * In-memory state management for active rides and rider locations
 * Thread-safe singleton pattern
 */
class RideStateManager {
  private static instance: RideStateManager;
  private ridesState: AllRidesState = {};

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): RideStateManager {
    if (!RideStateManager.instance) {
      RideStateManager.instance = new RideStateManager();
    }
    return RideStateManager.instance;
  }

  /**
   * Initialize ride state if not exists
   */
  public initializeRide(rideId: string): void {
    if (!this.ridesState[rideId]) {
      this.ridesState[rideId] = {};
    }
  }

  /**
   * Update rider location in state
   */
  public updateRiderLocation(
    rideId: string,
    userId: string,
    location: Omit<RiderLocation, 'userId' | 'lastUpdate'>
  ): void {
    this.initializeRide(rideId);

    this.ridesState[rideId]![userId] = {
      userId,
      ...location,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get all riders in a ride
   */
  public getRideState(rideId: string): RideState {
    return this.ridesState[rideId] || {};
  }

  /**
   * Get specific rider's location
   */
  public getRiderLocation(rideId: string, userId: string): RiderLocation | null {
    const rideState = this.ridesState[rideId];
    if (!rideState) return null;
    return rideState[userId] || null;
  }

  /**
   * Remove rider from ride state
   */
  public removeRider(rideId: string, userId: string): boolean {
    const rideState = this.ridesState[rideId];
    if (!rideState) return false;

    delete rideState[userId];
    
    // Clean up empty ride state
    if (Object.keys(rideState).length === 0) {
      delete this.ridesState[rideId];
    }

    return true;
  }

  /**
   * Get initial state for a joining user
   * Returns all current rider locations except stale ones
   */
  public getInitialState(rideId: string, marshalId?: string): InitialStateResponse {
    const rideState = this.getRideState(rideId);
    const currentTime = Date.now();

    // Filter out stale riders
    const activeRiders = Object.values(rideState).filter(
      (rider) => !isLocationStale(rider.lastUpdate, currentTime)
    );

    const response: InitialStateResponse = {
      rideId,
      riders: activeRiders,
    };
    
    if (marshalId !== undefined) {
      response.marshalId = marshalId;
    }

    return response;
  }

  /**
   * Get count of active riders in a ride
   */
  public getActiveRiderCount(rideId: string): number {
    const rideState = this.getRideState(rideId);
    const currentTime = Date.now();

    return Object.values(rideState).filter(
      (rider) => !isLocationStale(rider.lastUpdate, currentTime)
    ).length;
  }

  /**
   * Get all active rides
   */
  public getAllActiveRides(): string[] {
    return Object.keys(this.ridesState);
  }

  /**
   * Clean up stale riders from all rides
   * Should be called periodically (e.g., every 30 seconds)
   */
  public cleanupStaleRiders(): { rideId: string; removedUsers: string[] }[] {
    const cleanedRides: { rideId: string; removedUsers: string[] }[] = [];
    const currentTime = Date.now();

    for (const [rideId, rideState] of Object.entries(this.ridesState)) {
      const removedUsers: string[] = [];

      for (const [userId, rider] of Object.entries(rideState)) {
        if (isLocationStale(rider.lastUpdate, currentTime)) {
          delete rideState[userId];
          removedUsers.push(userId);
        }
      }

      // Clean up empty ride state
      if (Object.keys(rideState).length === 0) {
        delete this.ridesState[rideId!];
      }

      if (removedUsers.length > 0) {
        cleanedRides.push({ rideId: rideId!, removedUsers });
      }
    }

    return cleanedRides;
  }

  /**
   * Clear all state (useful for testing or server restart)
   */
  public clearAll(): void {
    this.ridesState = {};
  }

  /**
   * Get state statistics (for monitoring/debugging)
   */
  public getStats(): {
    totalRides: number;
    totalRiders: number;
    ridesWithActivity: number;
  } {
    let totalRiders = 0;
    let ridesWithActivity = 0;
    const currentTime = Date.now();

    for (const rideState of Object.values(this.ridesState)) {
      const activeRiders = Object.values(rideState).filter(
        (rider) => !isLocationStale(rider.lastUpdate, currentTime)
      );
      
      totalRiders += activeRiders.length;
      if (activeRiders.length > 0) {
        ridesWithActivity++;
      }
    }

    return {
      totalRides: Object.keys(this.ridesState).length,
      totalRiders,
      ridesWithActivity,
    };
  }
}

// Export singleton instance
export default RideStateManager.getInstance();
