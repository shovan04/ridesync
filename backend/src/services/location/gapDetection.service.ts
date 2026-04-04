import { Server } from 'socket.io';
import { 
  ServerToClientEvents, 
  ClientToServerEvents,
  GapAlert 
} from '../../types/socket.types.js';
import rideStateService from './rideState.service.js';
import { detectGaps, LOCATION_CONFIG } from './location.utils.js';

/**
 * Gap Detection Service
 * Monitors rider distances and emits alerts when gaps exceed threshold
 */
class GapDetectionService {
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number = 10000; // Check every 10 seconds

  /**
   * Initialize gap detection with Socket.IO server
   */
  public initialize(
    io: Server<ClientToServerEvents, ServerToClientEvents>
  ): void {
    this.io = io;
    this.startPeriodicCheck();
    console.log('✅ Gap detection service initialized');
  }

  /**
   * Start periodic gap checking
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkAllRidesForGaps();
    }, this.checkIntervalMs);
  }

  /**
   * Check all active rides for gaps
   */
  private checkAllRidesForGaps(): void {
    if (!this.io) return;

    const activeRides = rideStateService.getAllActiveRides();

    for (const rideId of activeRides) {
      this.checkRideForGaps(rideId);
    }
  }

  /**
   * Check a specific ride for gaps between riders
   */
  public checkRideForGaps(rideId: string): void {
    if (!this.io) return;

    const rideState = rideStateService.getRideState(rideId);
    
    // Need at least 2 riders to detect gaps
    if (Object.keys(rideState).length < 2) {
      return;
    }

    const gaps = detectGaps(rideState, LOCATION_CONFIG.GAP_ALERT_THRESHOLD_METERS);

    // Emit gap alerts to all riders in the room
    for (const gap of gaps) {
      const alert: GapAlert = {
        rideId,
        userId1: gap.userId1,
        userId2: gap.userId2,
        distance: gap.distance,
        threshold: LOCATION_CONFIG.GAP_ALERT_THRESHOLD_METERS,
        timestamp: Date.now(),
      };

      // Send alert to all riders in the room
      this.io.to(rideId).emit('gap:alert', alert);

      console.log(`⚠️  Gap detected in ride ${rideId}: ${gap.userId1} <-> ${gap.userId2} (${gap.distance.toFixed(0)}m)`);
    }
  }

  /**
   * Manually trigger gap check for a ride (e.g., after location update)
   */
  public triggerGapCheck(rideId: string): void {
    this.checkRideForGaps(rideId);
  }

  /**
   * Stop gap detection
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️  Gap detection service stopped');
    }
  }

  /**
   * Get gap detection status
   */
  public getStatus(): {
    isRunning: boolean;
    checkIntervalMs: number;
    threshold: number;
  } {
    return {
      isRunning: this.checkInterval !== null,
      checkIntervalMs: this.checkIntervalMs,
      threshold: LOCATION_CONFIG.GAP_ALERT_THRESHOLD_METERS,
    };
  }
}

// Export singleton instance
export default new GapDetectionService();
