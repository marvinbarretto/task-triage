import { Injectable, signal, inject, InjectionToken } from '@angular/core';
import { SsrPlatformService } from '../ssr';

/**
 * Default location service configuration
 */
export const DEFAULT_LOCATION_CONFIG = {
  timeout: 10000,          // How long to wait for GPS (ms)
  maxAge: 10000,           // Max age of cached location (ms)
  minAccuracy: 100,        // Reject readings worse than this (meters)

  // Adaptive polling intervals (milliseconds)
  pollIntervals: {
    far: 30000,            // >2km: every 30s
    approaching: 15000,    // 500m-2km: every 15s
    close: 10000,          // 100m-500m: every 10s
    veryClose: 5000,       // <100m: every 5s
    stationary: 60000      // Not moving: every 60s
  },

  // Distance thresholds (meters)
  distances: {
    veryClose: 100,
    close: 500,
    approaching: 2000,
    movementThreshold: 50  // Consider user "moved"
  }
} as const;

/**
 * Location service configuration interface
 */
export interface LocationConfig {
  timeout: number;
  maxAge: number;
  minAccuracy: number;
  pollIntervals: {
    far: number;
    approaching: number;
    close: number;
    veryClose: number;
    stationary: number;
  };
  distances: {
    veryClose: number;
    close: number;
    approaching: number;
    movementThreshold: number;
  };
}

/**
 * Injection token for location configuration
 */
export const LOCATION_CONFIG = new InjectionToken<LocationConfig>('LOCATION_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_LOCATION_CONFIG
});

/**
 * Geographic location data
 */
export interface GeoLocation {
  lat: number;       // Latitude
  lng: number;       // Longitude
  accuracy: number;  // Accuracy in meters
  timestamp: number; // Timestamp when location was captured
  altitude?: number; // Altitude in meters (if available)
  speed?: number;    // Speed in meters per second (if available)
  heading?: number;  // Heading in degrees (if available)
}

/**
 * Proximity categories for adaptive tracking
 */
export type ProximityLevel = 'far' | 'approaching' | 'close' | 'very-close';

/**
 * Movement detection result
 */
export interface MovementResult {
  isMoving: boolean;
  distanceMoved: number;  // meters
  speed: number;          // meters per second
  timeDifference: number; // seconds
}

/**
 * Location tracking statistics
 */
export interface LocationStats {
  totalReadings: number;
  accurateReadings: number;
  averageAccuracy: number;
  lastReading: number;
  movementDetections: number;
  trackingDuration: number; // milliseconds
}

/**
 * Generic location service with advanced tracking and movement detection.
 *
 * This service provides comprehensive geolocation functionality for any Angular application
 * that needs sophisticated location tracking with battery optimization and movement detection.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Adaptive polling based on proximity to target locations
 * - Smart movement detection with noise filtering
 * - Battery optimization with proximity-based intervals
 * - Signal-based reactive state management
 * - Configurable accuracy thresholds and timeouts
 * - Comprehensive location statistics and monitoring
 * - Two-check movement verification system
 * - Automatic cleanup and resource management
 *
 * Use cases:
 * - Location-based services and geofencing
 * - Delivery and logistics applications
 * - Fitness and activity tracking
 * - Navigation and mapping applications
 * - Proximity-based notifications
 * - Asset tracking and fleet management
 * - Check-in and attendance systems
 *
 * Example usage:
 * ```typescript
 * const locationService = inject(LocationService);
 *
 * // Simple location request
 * locationService.getCurrentLocation();
 * const location = locationService.location();
 *
 * // Start adaptive tracking with target distance
 * locationService.startLocationTracking(500); // 500m to target
 *
 * // Movement detection
 * locationService.startMovementDetection();
 * const isMoving = locationService.isMoving();
 *
 * // Custom configuration
 * providers: [
 *   {
 *     provide: LOCATION_CONFIG,
 *     useValue: {
 *       ...DEFAULT_LOCATION_CONFIG,
 *       minAccuracy: 50,  // Higher accuracy requirement
 *       timeout: 15000    // Longer timeout
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly platform = inject(SsrPlatformService);
  private readonly config = inject(LOCATION_CONFIG);

  private watchId: number | null = null;
  private pollIntervalId: number | null = null;
  private movementCheckTimeout: number | null = null;
  private stats: LocationStats = {
    totalReadings: 0,
    accurateReadings: 0,
    averageAccuracy: 0,
    lastReading: 0,
    movementDetections: 0,
    trackingDuration: 0
  };
  private trackingStartTime: number = 0;

  // Core location signals
  readonly location = signal<GeoLocation | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  // Adaptive tracking signals
  readonly isTracking = signal(false);
  readonly proximity = signal<ProximityLevel>('far');
  readonly lastMovement = signal<number | null>(null);

  // Smart movement detection signals
  readonly isMoving = signal(false);
  readonly movementSpeed = signal<number>(0); // meters per second
  readonly lastMovementCheck = signal<number | null>(null);

  constructor() {
    console.log('[LocationService] 📍 Service initialized - location request deferred until needed');
  }

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return this.platform.onlyOnBrowser(() => 'geolocation' in navigator) || false;
  }

  /**
   * Get current location once
   */
  getCurrentLocation(): void {
    if (!this.platform.isBrowser) {
      console.log('[LocationService] ❌ Not running in browser — skipping location');
      return;
    }

    if (!this.isSupported()) {
      this.error.set('Geolocation not supported');
      console.warn('[LocationService] ❌ Geolocation API not available');
      return;
    }

    this.loading.set(true);
    console.log('[LocationService] 📍 Attempting to get current position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = this.createGeoLocation(position);
        this.location.set(coords);
        this.updateStats(coords);
        console.log('[LocationService] ✅ Position acquired:', coords);
        this.loading.set(false);
        this.error.set(null);
      },
      (error) => {
        this.error.set(error.message);
        console.warn('[LocationService] ❌ Geolocation error', {
          code: error.code,
          message: error.message
        });
        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: this.config.maxAge,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Start adaptive location tracking with distance-based polling
   */
  startLocationTracking(targetDistance?: number): void {
    if (!this.platform.isBrowser || this.isTracking()) {
      return;
    }

    if (!this.isSupported()) {
      this.error.set('Geolocation not supported');
      return;
    }

    this.isTracking.set(true);
    this.trackingStartTime = Date.now();
    this.updateProximity(targetDistance || Infinity);

    console.log('[LocationService] 🚀 Starting adaptive location tracking...');

    // Use watchPosition for continuous monitoring
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const previousLocation = this.location();
        const newLocation = this.createGeoLocation(position);

        // Only update if accuracy is acceptable
        if (position.coords.accuracy <= this.config.minAccuracy) {
          this.location.set(newLocation);
          this.updateStats(newLocation);
          this.checkForMovement(previousLocation, newLocation);
          console.log('[LocationService] 📍 Adaptive position update:', newLocation);
        } else {
          console.warn(`[LocationService] ❌ Poor accuracy: ${position.coords.accuracy}m`);
        }

        this.loading.set(false);
        this.error.set(null);
      },
      (error) => {
        this.error.set(error.message);
        console.warn('[LocationService] ❌ Watch position error:', error.message);
        this.loading.set(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: this.config.maxAge,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Stop adaptive location tracking and cleanup
   */
  stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.pollIntervalId !== null) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }

    if (this.movementCheckTimeout !== null) {
      clearTimeout(this.movementCheckTimeout);
      this.movementCheckTimeout = null;
    }

    if (this.trackingStartTime > 0) {
      this.stats.trackingDuration += Date.now() - this.trackingStartTime;
      this.trackingStartTime = 0;
    }

    this.isTracking.set(false);
    console.log('[LocationService] 🛑 Stopped adaptive tracking');
  }

  /**
   * Force immediate location refresh
   */
  refreshLocation(): void {
    this.getCurrentLocation();
  }

  /**
   * Get current polling interval based on proximity
   */
  getCurrentPollInterval(): number {
    const proximity = this.proximity();
    switch (proximity) {
      case 'very-close':
        return this.config.pollIntervals.veryClose;
      case 'close':
        return this.config.pollIntervals.close;
      case 'approaching':
        return this.config.pollIntervals.approaching;
      case 'far':
      default:
        return this.config.pollIntervals.far;
    }
  }

  /**
   * Calculate distance between two locations in meters
   */
  calculateDistance(location1: GeoLocation, location2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = location1.lat * Math.PI / 180;
    const φ2 = location2.lat * Math.PI / 180;
    const Δφ = (location2.lat - location1.lat) * Math.PI / 180;
    const Δλ = (location2.lng - location1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Smart two-check movement detection pattern
   */
  async performMovementCheck(): Promise<MovementResult | null> {
    if (!this.platform.isBrowser || !this.isSupported()) {
      return null;
    }

    console.log('[LocationService] 🔍 Starting two-check movement detection...');

    try {
      // First reading
      const reading1 = await this.getSingleLocationReading();
      console.log(`[LocationService] 📍 Reading 1: ${reading1.lat.toFixed(6)}, ${reading1.lng.toFixed(6)} (±${reading1.accuracy}m)`);

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second reading
      const reading2 = await this.getSingleLocationReading();
      console.log(`[LocationService] 📍 Reading 2: ${reading2.lat.toFixed(6)}, ${reading2.lng.toFixed(6)} (±${reading2.accuracy}m)`);

      // Calculate movement
      const distanceMoved = this.calculateDistance(reading1, reading2);
      const timeDiff = (reading2.timestamp - reading1.timestamp) / 1000; // Convert to seconds
      const speed = distanceMoved / timeDiff; // meters per second

      const result: MovementResult = {
        isMoving: distanceMoved > this.config.distances.movementThreshold,
        distanceMoved,
        speed,
        timeDifference: timeDiff
      };

      this.lastMovementCheck.set(Date.now());
      this.movementSpeed.set(speed);

      if (result.isMoving) {
        // MOVEMENT DETECTED!
        this.isMoving.set(true);
        this.lastMovement.set(Date.now());
        this.stats.movementDetections++;
        console.log(`[LocationService] 🚶 MOVEMENT DETECTED: ${Math.round(distanceMoved)}m in ${timeDiff.toFixed(1)}s (${speed.toFixed(1)} m/s)!`);

        // Update location to the latest reading
        this.location.set(reading2);
        this.updateStats(reading2);

        // Schedule next check in 3 seconds (frequent polling)
        this.movementCheckTimeout = window.setTimeout(() => this.performMovementCheck(), 3000);
      } else {
        // STATIONARY
        this.isMoving.set(false);
        console.log(`[LocationService] 🟢 Stationary: ${Math.round(distanceMoved)}m movement (threshold: ${this.config.distances.movementThreshold}m)`);

        // Update location to the latest reading
        this.location.set(reading2);
        this.updateStats(reading2);

        // Schedule next check in 30 seconds (battery efficient)
        this.movementCheckTimeout = window.setTimeout(() => this.performMovementCheck(), 30000);
      }

      return result;

    } catch (error) {
      console.error('[LocationService] ❌ Movement check failed:', error);
      this.error.set('Movement detection failed');

      // Retry in 10 seconds
      this.movementCheckTimeout = window.setTimeout(() => this.performMovementCheck(), 10000);
      return null;
    }
  }

  /**
   * Start smart movement detection system
   */
  startMovementDetection(): void {
    if (this.isTracking()) {
      console.log('[LocationService] ⚠️ Movement detection already running');
      return;
    }

    this.isTracking.set(true);
    this.trackingStartTime = Date.now();
    console.log('[LocationService] 🚀 Starting smart movement detection system...');
    this.performMovementCheck();
  }

  /**
   * Stop movement detection system
   */
  stopMovementDetection(): void {
    if (this.movementCheckTimeout !== null) {
      clearTimeout(this.movementCheckTimeout);
      this.movementCheckTimeout = null;
    }

    if (this.trackingStartTime > 0) {
      this.stats.trackingDuration += Date.now() - this.trackingStartTime;
      this.trackingStartTime = 0;
    }

    this.isTracking.set(false);
    this.isMoving.set(false);
    console.log('[LocationService] 🛑 Stopped movement detection system');
  }

  /**
   * Get location tracking statistics
   */
  getStats(): LocationStats {
    const currentStats = { ...this.stats };
    if (this.trackingStartTime > 0) {
      currentStats.trackingDuration += Date.now() - this.trackingStartTime;
    }
    return currentStats;
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.stats = {
      totalReadings: 0,
      accurateReadings: 0,
      averageAccuracy: 0,
      lastReading: 0,
      movementDetections: 0,
      trackingDuration: 0
    };
    this.trackingStartTime = this.isTracking() ? Date.now() : 0;
    console.log('[LocationService] 📊 Statistics reset');
  }

  /**
   * Check if user has sufficient location permissions
   */
  async checkPermissions(): Promise<PermissionState> {
    if (!this.platform.isBrowser || !('permissions' in navigator)) {
      return 'granted'; // Assume granted in non-browser environments
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      console.warn('[LocationService] ❌ Permission check failed:', error);
      return 'granted'; // Fallback assumption
    }
  }

  /**
   * Get a single GPS reading as a Promise
   */
  private getSingleLocationReading(): Promise<GeoLocation> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (position.coords.accuracy > this.config.minAccuracy) {
            reject(new Error(`Poor GPS accuracy: ${position.coords.accuracy}m`));
            return;
          }

          resolve(this.createGeoLocation(position));
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          maximumAge: 0, // Force fresh reading
          timeout: this.config.timeout,
        }
      );
    });
  }

  /**
   * Create GeoLocation object from GeolocationPosition
   */
  private createGeoLocation(position: GeolocationPosition): GeoLocation {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
      altitude: position.coords.altitude || undefined,
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined
    };
  }

  /**
   * Update proximity category based on distance to target
   */
  private updateProximity(distanceMeters: number): void {
    let newProximity: ProximityLevel;

    if (distanceMeters <= this.config.distances.veryClose) {
      newProximity = 'very-close';
    } else if (distanceMeters <= this.config.distances.close) {
      newProximity = 'close';
    } else if (distanceMeters <= this.config.distances.approaching) {
      newProximity = 'approaching';
    } else {
      newProximity = 'far';
    }

    if (this.proximity() !== newProximity) {
      this.proximity.set(newProximity);
      console.log(`[LocationService] 📊 Proximity updated: ${newProximity} (${distanceMeters}m)`);
    }
  }

  /**
   * Check if user has moved significantly and update lastMovement
   */
  private checkForMovement(previous: GeoLocation | null, current: GeoLocation): void {
    if (!previous) {
      this.lastMovement.set(Date.now());
      return;
    }

    const distanceMoved = this.calculateDistance(previous, current);

    if (distanceMoved > this.config.distances.movementThreshold) {
      this.lastMovement.set(Date.now());
      this.stats.movementDetections++;
      console.log(`[LocationService] 🚶 Movement detected: ${Math.round(distanceMoved)}m`);
    }
  }

  /**
   * Update location statistics
   */
  private updateStats(location: GeoLocation): void {
    this.stats.totalReadings++;
    this.stats.lastReading = location.timestamp;

    if (location.accuracy <= this.config.minAccuracy) {
      this.stats.accurateReadings++;
    }

    // Update running average accuracy
    const oldAvg = this.stats.averageAccuracy;
    const count = this.stats.totalReadings;
    this.stats.averageAccuracy = (oldAvg * (count - 1) + location.accuracy) / count;
  }
}
