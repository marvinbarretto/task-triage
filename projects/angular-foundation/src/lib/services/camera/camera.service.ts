import { Injectable, inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SsrPlatformService } from '../ssr';

/**
 * Default camera service configuration
 */
export const DEFAULT_CAMERA_CONFIG = {
  defaultConstraints: { video: true, audio: false },
  maxCleanupAttempts: 3,
  videoReadyTimeout: 5000,
  defaultPhotoQuality: 0.95,
  enableEmergencyCleanup: true
} as const;

/**
 * Camera service configuration interface
 */
export interface CameraConfig {
  defaultConstraints: MediaStreamConstraints;
  maxCleanupAttempts: number;
  videoReadyTimeout: number;
  defaultPhotoQuality: number;
  enableEmergencyCleanup: boolean;
}

/**
 * Injection token for camera configuration
 */
export const CAMERA_CONFIG = new InjectionToken<CameraConfig>('CAMERA_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_CAMERA_CONFIG
});

/**
 * Camera state interface
 */
export interface CameraState {
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
  streamId: string | null;
}

/**
 * Photo capture result interface
 */
export interface PhotoCaptureResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  dimensions: { width: number; height: number };
  quality: number;
  timestamp: number;
}

/**
 * Generic camera management service for Angular applications.
 *
 * This service provides comprehensive camera functionality with MediaStream lifecycle management,
 * photo capture capabilities, and robust cleanup strategies to prevent camera light persistence issues.
 *
 * Features:
 * - SSR-safe implementation using SsrPlatformService
 * - Centralized camera permissions and MediaStream lifecycle management
 * - Video element attachment and stream management
 * - Photo capture from video streams with multiple output formats (canvas, blob, dataURL)
 * - Camera hardware cleanup and error recovery
 * - Cross-browser compatibility for getUserMedia
 * - Reactive state management with BehaviorSubject
 * - Aggressive cleanup strategies to prevent camera light issues
 * - Emergency cleanup for persistent camera problems
 * - Configurable constraints and quality settings
 *
 * Use cases:
 * - Profile picture capture applications
 * - Document scanning and OCR workflows
 * - Video conferencing and live streaming
 * - Augmented reality applications
 * - Security and verification systems
 * - Photo booth and image editing apps
 * - QR code scanning applications
 *
 * Example usage:
 * ```typescript
 * const cameraService = inject(CameraService);
 *
 * // Basic camera access
 * try {
 *   const stream = await cameraService.requestCamera();
 *   // Use stream for video element
 * } catch (error) {
 *   console.error('Camera access denied:', error);
 * }
 *
 * // Subscribe to camera state changes
 * cameraService.state$.subscribe(state => {
 *   console.log('Camera active:', state.isActive);
 * });
 *
 * // Attach to video element
 * const video = document.createElement('video');
 * cameraService.attachToVideoElement(video, stream);
 *
 * // Capture photo
 * await cameraService.waitForVideoReady(video);
 * if (cameraService.isCameraReadyForCapture(video)) {
 *   const photo = await cameraService.capturePhotoToCanvas(video);
 *   // Use photo.blob or photo.dataUrl
 * }
 *
 * // Clean up
 * await cameraService.releaseCamera();
 *
 * // Custom configuration
 * providers: [
 *   {
 *     provide: CAMERA_CONFIG,
 *     useValue: {
 *       ...DEFAULT_CAMERA_CONFIG,
 *       defaultPhotoQuality: 0.8,
 *       maxCleanupAttempts: 5
 *     }
 *   }
 * ]
 * ```
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly platform = inject(SsrPlatformService);
  private readonly config = inject(CAMERA_CONFIG);

  // REACTIVE STATE: BehaviorSubject to track camera state changes
  private readonly _state = new BehaviorSubject<CameraState>({
    isActive: false,
    hasPermission: false,
    error: null,
    streamId: null
  });

  // STREAM MANAGEMENT: Keep reference to the active MediaStream
  private _currentStream: MediaStream | null = null;

  // VIDEO ELEMENT TRACKING: Keep reference to attached video element for cleanup
  private _videoElement: HTMLVideoElement | null = null;

  // CLEANUP TRACKING: Count cleanup attempts to prevent infinite loops
  private _cleanupAttempts = 0;

  // Public observables
  readonly state$: Observable<CameraState> = this._state.asObservable();

  get currentState(): CameraState {
    return this._state.value;
  }

  get isActive(): boolean {
    return this._state.value.isActive;
  }

  get currentStream(): MediaStream | null {
    return this._currentStream;
  }

  constructor() {
    console.log('[CameraService] 📷 Service initialized - camera request deferred until needed');
  }

  /**
   * Check if camera is supported in current environment
   */
  isSupported(): boolean {
    return this.platform.onlyOnBrowser(() =>
      'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    ) || false;
  }

  /**
   * Request camera access with proper error handling
   */
  async requestCamera(constraints: MediaStreamConstraints = this.config.defaultConstraints): Promise<MediaStream> {
    if (!this.platform.isBrowser) {
      throw new Error('Camera access not available in non-browser environment');
    }

    if (!this.isSupported()) {
      throw new Error('Camera not supported in this browser');
    }

    console.log('[CameraService] 📷 Requesting camera access...');

    try {
      // Reuse existing stream if already active
      if (this._currentStream && this.isActive) {
        console.log('[CameraService] Reusing existing stream');
        return this._currentStream;
      }

      // Cleanup any previous streams
      await this.releaseCamera();

      // Request new MediaStream
      console.log('[CameraService] Calling navigator.mediaDevices.getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this._currentStream = stream;
      this._cleanupAttempts = 0;

      this._state.next({
        isActive: true,
        hasPermission: true,
        error: null,
        streamId: stream.id
      });

      console.log('[CameraService] ✅ Camera access granted, stream ID:', stream.id);
      console.log('[CameraService] Stream has', stream.getTracks().length, 'tracks');

      return stream;

    } catch (error: any) {
      console.warn('[CameraService] ❌ Failed to get camera access:', error.message);

      this._state.next({
        isActive: false,
        hasPermission: false,
        error: error.message,
        streamId: null
      });

      throw error;
    }
  }

  /**
   * Release camera with aggressive cleanup strategy
   */
  async releaseCamera(force = false): Promise<void> {
    if (!this.platform.isBrowser) {
      return;
    }

    console.log('[CameraService] 📷 Releasing camera...');

    if (!this._currentStream && !force) {
      console.log('[CameraService] No active stream to release');
      return;
    }

    this._cleanupAttempts++;
    console.log('[CameraService] Cleanup attempt #' + this._cleanupAttempts);

    try {
      // Stop all tracks in the main MediaStream
      if (this._currentStream) {
        await this._stopStreamTracks(this._currentStream);
        this._currentStream = null;
      }

      // Clean up attached video element
      if (this._videoElement) {
        this._cleanupVideoElement(this._videoElement);
        this._videoElement = null;
      }

      // Find and clean up any orphaned video elements
      this._cleanupOrphanedVideoElements();

      // Emergency cleanup using "fresh stream" technique
      if (this.config.enableEmergencyCleanup && this._cleanupAttempts <= this.config.maxCleanupAttempts) {
        await this._emergencyCleanup();
      }

      this._state.next({
        isActive: false,
        hasPermission: true, // Keep permission status
        error: null,
        streamId: null
      });

      console.log('[CameraService] ✅ Camera release complete');

    } catch (error: any) {
      console.warn('[CameraService] ❌ Error during release:', error);

      this._state.next({
        isActive: false,
        hasPermission: false,
        error: error.message,
        streamId: null
      });
    }
  }

  /**
   * Attach stream to video element with proper management
   */
  attachToVideoElement(videoElement: HTMLVideoElement, stream: MediaStream): void {
    if (!this.platform.isBrowser) {
      return;
    }

    console.log('[CameraService] Attaching stream to video element');

    // Clean up previous video element
    if (this._videoElement && this._videoElement !== videoElement) {
      this._cleanupVideoElement(this._videoElement);
    }

    this._videoElement = videoElement;
    videoElement.srcObject = stream;

    console.log('[CameraService] Video element attached');
  }

  /**
   * Emergency cleanup for persistent camera issues
   */
  async emergencyCleanup(): Promise<void> {
    if (!this.platform.isBrowser) {
      return;
    }

    console.log('[CameraService] 🚨 Emergency cleanup initiated');

    // Stop everything we can find
    this._cleanupOrphanedVideoElements();

    // Try the "get fresh stream and stop it" technique
    if (this.config.enableEmergencyCleanup) {
      await this._emergencyCleanup();
    }

    // Reset internal state
    this._currentStream = null;
    this._videoElement = null;
    this._cleanupAttempts = 0;

    this._state.next({
      isActive: false,
      hasPermission: false,
      error: null,
      streamId: null
    });

    console.log('[CameraService] ✅ Emergency cleanup complete');
  }

  /**
   * Check if video element is ready for photo capture
   */
  isCameraReadyForCapture(video: HTMLVideoElement): boolean {
    if (!this.platform.isBrowser) {
      return false;
    }

    const isReady = video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
                   video.videoWidth > 0 &&
                   video.videoHeight > 0;

    console.log('[CameraService] Readiness check:', {
      readyState: video.readyState,
      dimensions: `${video.videoWidth}x${video.videoHeight}`,
      isReady
    });

    return isReady;
  }

  /**
   * Wait for video element to be ready for photo capture
   */
  async waitForVideoReady(video: HTMLVideoElement, timeoutMs: number = this.config.videoReadyTimeout): Promise<void> {
    if (!this.platform.isBrowser) {
      throw new Error('Video ready check not available in non-browser environment');
    }

    console.log('[CameraService] 📷 Waiting for video to be ready...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Video ready timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };

      const checkReady = () => {
        if (this.isCameraReadyForCapture(video)) {
          console.log('[CameraService] ✅ Video ready for capture:', {
            readyState: video.readyState,
            dimensions: `${video.videoWidth}x${video.videoHeight}`
          });
          cleanup();
          resolve();
          return true;
        }
        return false;
      };

      const onLoadedMetadata = () => {
        console.log('[CameraService] Video metadata loaded');
        checkReady();
      };

      const onCanPlay = () => {
        console.log('[CameraService] Video can play');
        checkReady();
      };

      const onError = (event: Event) => {
        console.error('[CameraService] Video error during loading', event);
        cleanup();
        reject(new Error('Video loading error'));
      };

      // Add event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);

      // Start playing and check if already ready
      video.play().then(() => {
        console.log('[CameraService] Video play() resolved');
        if (!checkReady()) {
          console.log('[CameraService] Video playing but not ready, waiting for events...');
        }
      }).catch((playError) => {
        console.error('[CameraService] Video play() failed:', playError);
        cleanup();
        reject(playError);
      });
    });
  }

  /**
   * Capture photo from video stream with multiple output formats
   */
  async capturePhotoToCanvas(
    video: HTMLVideoElement,
    quality: number = this.config.defaultPhotoQuality
  ): Promise<PhotoCaptureResult> {
    if (!this.platform.isBrowser) {
      throw new Error('Photo capture not available in non-browser environment');
    }

    console.log('[CameraService] 📸 Capturing photo...');

    if (!this.isCameraReadyForCapture(video)) {
      throw new Error('Camera is not ready for photo capture. Call isCameraReadyForCapture() first.');
    }

    try {
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
      }

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dimensions = { width: canvas.width, height: canvas.height };
      const timestamp = Date.now();

      console.log('[CameraService] Photo captured to canvas:', { dimensions, quality });

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      // Convert to blob
      const blob = await this._canvasToBlob(canvas, quality);

      const result: PhotoCaptureResult = {
        canvas,
        dataUrl,
        blob,
        dimensions,
        quality,
        timestamp
      };

      console.log('[CameraService] ✅ Photo capture complete:', {
        dataUrlLength: dataUrl.length,
        blobSize: blob.size,
        dimensions
      });

      return result;

    } catch (error) {
      console.error('[CameraService] ❌ Photo capture failed:', error);
      throw error;
    }
  }

  /**
   * Check camera permissions status
   */
  async checkPermissions(): Promise<PermissionState> {
    if (!this.platform.isBrowser || !('permissions' in navigator)) {
      return 'granted'; // Assume granted in non-browser environments
    }

    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return permission.state;
    } catch (error) {
      console.warn('[CameraService] ❌ Permission check failed:', error);
      return 'granted'; // Fallback assumption
    }
  }

  /**
   * Get available camera devices
   */
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    if (!this.platform.isBrowser || !this.isSupported()) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.warn('[CameraService] ❌ Failed to enumerate devices:', error);
      return [];
    }
  }

  // Private helper methods

  private async _stopStreamTracks(stream: MediaStream): Promise<void> {
    console.log('[CameraService] Stopping stream tracks...');

    const tracks = stream.getTracks();
    console.log('[CameraService] Found', tracks.length, 'tracks to stop');

    tracks.forEach((track, index) => {
      console.log(`[CameraService] Stopping track #${index}: ${track.kind} (${track.label}) - readyState: ${track.readyState}`);
      track.stop();
      console.log(`[CameraService] Track #${index} stopped - new readyState: ${track.readyState}`);
    });
  }

  private _cleanupVideoElement(videoElement: HTMLVideoElement): void {
    console.log('[CameraService] Cleaning up video element...');

    try {
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => {
            console.log('[CameraService] Stopping video element track:', track.kind);
            track.stop();
          });
        }
      }

      videoElement.pause();
      videoElement.srcObject = null;
      videoElement.load();

      console.log('[CameraService] Video element cleaned up');
    } catch (error) {
      console.warn('[CameraService] Error cleaning video element:', error);
    }
  }

  private _cleanupOrphanedVideoElements(): void {
    if (!this.platform.isBrowser) {
      return;
    }

    console.log('[CameraService] Searching for orphaned video elements...');

    const videoElements = document.querySelectorAll('video');
    console.log('[CameraService] Found', videoElements.length, 'video elements');

    videoElements.forEach((video, index) => {
      if (video.srcObject) {
        console.log(`[CameraService] Cleaning orphaned video element #${index}`);
        this._cleanupVideoElement(video);
      }
    });
  }

  private async _emergencyCleanup(): Promise<void> {
    console.log('[CameraService] Attempting emergency fresh stream cleanup...');

    try {
      const emergencyStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('[CameraService] Got emergency stream, stopping immediately...');

      emergencyStream.getTracks().forEach(track => {
        console.log('[CameraService] Emergency stopping track:', track.kind);
        track.stop();
      });

      console.log('[CameraService] Emergency cleanup successful');
    } catch (error) {
      console.warn('[CameraService] Emergency cleanup failed (this might be good):', error);
    }
  }

  private async _canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', quality);
    });
  }
}
