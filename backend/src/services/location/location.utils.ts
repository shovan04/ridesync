import { getDistance } from 'geolib';
import { LocationUpdate, RiderLocation } from '../../types/socket.types.js';

/**
 * Location validation and optimization utilities
 */

// Configuration constants
export const LOCATION_CONFIG = {
  MIN_MOVEMENT_METERS: 10, // Ignore updates if movement < 10 meters
  UPDATE_THROTTLE_MS: 4000, // Throttle updates to 4 seconds (between 3-5s)
  STALE_THRESHOLD_MS: 15000, // Consider user stale after 15 seconds
  GAP_ALERT_THRESHOLD_METERS: 500, // Alert if riders are > 500m apart
  MAX_LOCATION_AGE_MS: 30000, // Max age of location data (30 seconds)
};

/**
 * Validate location update data
 */
export function validateLocationUpdate(data: LocationUpdate): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid location data' };
  }

  if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
    return { valid: false, error: 'Latitude and longitude must be numbers' };
  }

  // Validate latitude range (-90 to 90)
  if (data.lat < -90 || data.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }

  // Validate longitude range (-180 to 180)
  if (data.lng < -180 || data.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }

  // Optional: Validate speed if provided
  if (data.speed !== undefined && (data.speed < 0 || data.speed > 300)) {
    return { valid: false, error: 'Speed must be between 0 and 300 km/h' };
  }

  // Optional: Validate heading if provided
  if (data.heading !== undefined && (data.heading < 0 || data.heading > 360)) {
    return { valid: false, error: 'Heading must be between 0 and 360 degrees' };
  }

  return { valid: true };
}

/**
 * Check if location update should be throttled
 * Returns true if enough time has passed since last update
 */
export function shouldThrottleUpdate(lastUpdateTs: number, currentTs: number): boolean {
  const timeDiff = currentTs - lastUpdateTs;
  return timeDiff < LOCATION_CONFIG.UPDATE_THROTTLE_MS;
}

/**
 * Calculate distance between two locations in meters
 */
export function calculateDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  return getDistance(
    { latitude: loc1.lat, longitude: loc1.lng },
    { latitude: loc2.lat, longitude: loc2.lng }
  );
}

/**
 * Check if movement is significant enough to broadcast
 * Returns true if movement >= MIN_MOVEMENT_METERS
 */
export function hasSignificantMovement(
  previousLocation: RiderLocation | null,
  newLocation: LocationUpdate
): boolean {
  if (!previousLocation) {
    return true; // Always send first location
  }

  const distance = calculateDistance(
    { lat: previousLocation.lat, lng: previousLocation.lng },
    { lat: newLocation.lat, lng: newLocation.lng }
  );

  return distance >= LOCATION_CONFIG.MIN_MOVEMENT_METERS;
}

/**
 * Check if a rider's location is stale
 */
export function isLocationStale(lastUpdate: number, currentTime: number = Date.now()): boolean {
  return (currentTime - lastUpdate) > LOCATION_CONFIG.STALE_THRESHOLD_MS;
}

/**
 * Find all stale riders in a ride
 */
export function findStaleRiders(
  riders: Record<string, RiderLocation>,
  currentTime: number = Date.now()
): string[] {
  const staleRiders: string[] = [];
  
  for (const [userId, location] of Object.entries(riders)) {
    if (isLocationStale(location.lastUpdate, currentTime)) {
      staleRiders.push(userId);
    }
  }
  
  return staleRiders;
}

/**
 * Detect gaps between riders in a ride
 * Returns array of gap alerts
 */
export function detectGaps(
  riders: Record<string, RiderLocation>,
  threshold: number = LOCATION_CONFIG.GAP_ALERT_THRESHOLD_METERS
): Array<{ userId1: string; userId2: string; distance: number }> {
  const alerts: Array<{ userId1: string; userId2: string; distance: number }> = [];
  const riderIds = Object.keys(riders);
  
  // Compare each pair of riders
  for (let i = 0; i < riderIds.length; i++) {
    for (let j = i + 1; j < riderIds.length; j++) {
      const rider1 = riders[riderIds[i]!];
      const rider2 = riders[riderIds[j]!];
      
      if (!rider1 || !rider2) continue;
      
      // Skip stale riders
      if (isLocationStale(rider1.lastUpdate) || isLocationStale(rider2.lastUpdate)) {
        continue;
      }
      
      const distance = calculateDistance(
        { lat: rider1.lat, lng: rider1.lng },
        { lat: rider2.lat, lng: rider2.lng }
      );
      
      if (distance > threshold) {
        alerts.push({
          userId1: riderIds[i]!,
          userId2: riderIds[j]!,
          distance,
        });
      }
    }
  }
  
  return alerts;
}

/**
 * Sanitize location data before broadcasting
 */
export function sanitizeLocation(location: LocationUpdate): LocationUpdate {
  const sanitized: LocationUpdate = {
    lat: Number(location.lat.toFixed(6)), // ~11cm precision
    lng: Number(location.lng.toFixed(6)),
  };
  
  if (location.speed !== undefined) {
    sanitized.speed = Number(location.speed.toFixed(1));
  }
  
  if (location.heading !== undefined) {
    sanitized.heading = Number(location.heading.toFixed(1));
  }
  
  if (location.accuracy !== undefined) {
    sanitized.accuracy = Number(location.accuracy.toFixed(1));
  }
  
  return sanitized;
}
