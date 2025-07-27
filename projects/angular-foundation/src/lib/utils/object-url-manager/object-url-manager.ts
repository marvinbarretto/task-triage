/**
 * Generic object URL manager for preventing memory leaks in Angular applications.
 * 
 * This utility class provides comprehensive blob URL lifecycle management with
 * automatic cleanup and tracking capabilities to prevent memory leaks from
 * object URLs created with URL.createObjectURL().
 * 
 * Features:
 * - Automatic tracking of blob URLs and their associated keys
 * - Smart cleanup of removed items to prevent memory leaks
 * - Generic interface for any object with key and URL properties
 * - Batch tracking operations for performance
 * - Comprehensive logging for debugging memory issues
 * - Safe cleanup methods with error handling
 * - Statistics and monitoring capabilities
 * 
 * Use cases:
 * - Image galleries with blob URLs from file uploads
 * - Document previews with generated object URLs
 * - Media players with dynamically created blob URLs
 * - File management systems with temporary URLs
 * - Any application creating object URLs that need cleanup
 * - Development and debugging of memory leak issues
 * 
 * Example usage:
 * ```typescript
 * import { ObjectUrlManager } from 'angular-foundation';
 * 
 * // In component
 * private urlManager = new ObjectUrlManager();
 * 
 * // Track items with blob URLs
 * const images = [
 *   { key: 'img1', imageUrl: 'blob:http://localhost:4200/abc123' },
 *   { key: 'img2', imageUrl: 'https://example.com/image.jpg' },
 *   { key: 'img3', imageUrl: 'blob:http://localhost:4200/def456' }
 * ];
 * 
 * this.urlManager.trackUrls(images);
 * 
 * // When component is destroyed
 * ngOnDestroy() {
 *   this.urlManager.cleanup();
 * }
 * 
 * // Check tracking status
 * console.log('Tracked URLs:', this.urlManager.getTrackedCount());
 * console.log('All tracked:', this.urlManager.getAllTrackedUrls());
 * ```
 */
export class ObjectUrlManager<T extends { key: string; [urlProperty: string]: string }> {
  private objectUrls = new Set<string>();
  private keyToUrlMap = new Map<string, string>();
  private urlProperty: string;
  private isCleanedUp = false;

  constructor(urlProperty: string = 'imageUrl') {
    this.urlProperty = urlProperty;
    console.log(`[ObjectUrlManager] 📎 Manager initialized for property: ${urlProperty}`);
  }

  /**
   * Track URLs for given items with keys
   */
  trackUrls(items: T[]): void {
    if (this.isCleanedUp) {
      console.warn('[ObjectUrlManager] ⚠️ Cannot track URLs - manager has been cleaned up');
      return;
    }

    if (!Array.isArray(items)) {
      console.warn('[ObjectUrlManager] ⚠️ trackUrls expects an array');
      return;
    }

    const currentKeys = new Set(items.map(item => item.key));
    let revokedCount = 0;
    let trackedCount = 0;
    
    // Revoke URLs for items that are no longer present
    this.keyToUrlMap.forEach((url, key) => {
      if (!currentKeys.has(key)) {
        this._revokeUrl(url);
        this.objectUrls.delete(url);
        this.keyToUrlMap.delete(key);
        revokedCount++;
        console.log(`[ObjectUrlManager] 🧹 Revoked URL for removed item: ${key}`);
      }
    });
    
    // Track new URLs
    items.forEach(item => {
      if (!item.key) {
        console.warn('[ObjectUrlManager] ⚠️ Item missing key property:', item);
        return;
      }

      const url = item[this.urlProperty];
      if (!url) {
        return; // Skip items without URL
      }

      if (this._isBlobUrl(url)) {
        if (!this.keyToUrlMap.has(item.key)) {
          this.objectUrls.add(url);
          this.keyToUrlMap.set(item.key, url);
          trackedCount++;
          console.log(`[ObjectUrlManager] 📎 Tracking new object URL for: ${item.key}`);
        } else if (this.keyToUrlMap.get(item.key) !== url) {
          // URL changed for existing key - revoke old and track new
          const oldUrl = this.keyToUrlMap.get(item.key)!;
          this._revokeUrl(oldUrl);
          this.objectUrls.delete(oldUrl);
          this.objectUrls.add(url);
          this.keyToUrlMap.set(item.key, url);
          console.log(`[ObjectUrlManager] 🔄 Updated URL for: ${item.key}`);
        }
      }
    });

    if (revokedCount > 0 || trackedCount > 0) {
      console.log(`[ObjectUrlManager] 📊 Processed ${items.length} items: +${trackedCount} tracked, -${revokedCount} revoked`);
    }
  }

  /**
   * Track individual URL with key
   */
  trackUrl(key: string, url: string): void {
    if (this.isCleanedUp) {
      console.warn('[ObjectUrlManager] ⚠️ Cannot track URL - manager has been cleaned up');
      return;
    }

    if (!key || !url) {
      console.warn('[ObjectUrlManager] ⚠️ trackUrl requires both key and url');
      return;
    }

    if (this._isBlobUrl(url)) {
      // Revoke existing URL for this key if different
      const existingUrl = this.keyToUrlMap.get(key);
      if (existingUrl && existingUrl !== url) {
        this._revokeUrl(existingUrl);
        this.objectUrls.delete(existingUrl);
      }

      this.objectUrls.add(url);
      this.keyToUrlMap.set(key, url);
      console.log(`[ObjectUrlManager] 📎 Tracking URL for: ${key}`);
    }
  }

  /**
   * Remove tracking for specific key
   */
  removeKey(key: string): boolean {
    const url = this.keyToUrlMap.get(key);
    if (url) {
      this._revokeUrl(url);
      this.objectUrls.delete(url);
      this.keyToUrlMap.delete(key);
      console.log(`[ObjectUrlManager] 🗑️ Removed tracking for: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up all tracked URLs
   */
  cleanup(): void {
    if (this.isCleanedUp) {
      console.log('[ObjectUrlManager] ✅ Already cleaned up');
      return;
    }

    const urlCount = this.objectUrls.size;
    
    this.objectUrls.forEach(url => {
      this._revokeUrl(url);
    });
    
    this.objectUrls.clear();
    this.keyToUrlMap.clear();
    this.isCleanedUp = true;
    
    console.log(`[ObjectUrlManager] 🧹 Cleaned up ${urlCount} object URLs`);
  }

  /**
   * Get number of tracked URLs
   */
  getTrackedCount(): number {
    return this.objectUrls.size;
  }

  /**
   * Get all tracked URLs
   */
  getAllTrackedUrls(): string[] {
    return Array.from(this.objectUrls);
  }

  /**
   * Get all tracked keys
   */
  getAllTrackedKeys(): string[] {
    return Array.from(this.keyToUrlMap.keys());
  }

  /**
   * Get URL for specific key
   */
  getUrlForKey(key: string): string | undefined {
    return this.keyToUrlMap.get(key);
  }

  /**
   * Check if a specific URL is being tracked
   */
  isTracking(url: string): boolean {
    return this.objectUrls.has(url);
  }

  /**
   * Check if a specific key is being tracked
   */
  isTrackingKey(key: string): boolean {
    return this.keyToUrlMap.has(key);
  }

  /**
   * Get manager statistics
   */
  getStats(): ObjectUrlManagerStats {
    return {
      totalTrackedUrls: this.objectUrls.size,
      totalTrackedKeys: this.keyToUrlMap.size,
      isCleanedUp: this.isCleanedUp,
      urlProperty: this.urlProperty,
      trackedKeys: this.getAllTrackedKeys(),
      trackedUrls: this.getAllTrackedUrls()
    };
  }

  /**
   * Reset manager (cleanup and allow new tracking)
   */
  reset(): void {
    this.cleanup();
    this.isCleanedUp = false;
    console.log('[ObjectUrlManager] 🔄 Manager reset');
  }

  // Private methods

  private _isBlobUrl(url: string): boolean {
    return typeof url === 'string' && url.startsWith('blob:');
  }

  private _revokeUrl(url: string): void {
    try {
      URL.revokeObjectURL(url);
      console.log(`[ObjectUrlManager] ✅ Revoked: ${url.substring(0, 50)}...`);
    } catch (error) {
      console.warn(`[ObjectUrlManager] ⚠️ Failed to revoke URL: ${url}`, error);
    }
  }
}

/**
 * Statistics interface for ObjectUrlManager
 */
export interface ObjectUrlManagerStats {
  totalTrackedUrls: number;
  totalTrackedKeys: number;
  isCleanedUp: boolean;
  urlProperty: string;
  trackedKeys: string[];
  trackedUrls: string[];
}

/**
 * Factory function to create ObjectUrlManager with type inference
 */
export function createObjectUrlManager<T extends { key: string; [urlProperty: string]: string }>(
  urlProperty: string = 'imageUrl'
): ObjectUrlManager<T> {
  return new ObjectUrlManager<T>(urlProperty);
}