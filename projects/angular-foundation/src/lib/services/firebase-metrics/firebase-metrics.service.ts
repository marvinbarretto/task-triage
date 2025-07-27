/**
 * @fileoverview FirebaseMetricsService - Track and measure Firebase operation calls
 * 
 * PURPOSE:
 * - Monitor Firebase read/write/delete operations across the app
 * - Provide session-based metrics to measure optimization efforts
 * - Reset counters on new sessions for clear regression testing
 * - Generate reports showing Firebase usage patterns
 * 
 * USAGE:
 * ```typescript
 * // In FirestoreCrudService or any Firebase operation
 * this.metricsService.trackCall('read', 'users');
 * this.metricsService.trackCall('write', 'checkins');
 * 
 * // Get current session metrics
 * const summary = this.metricsService.getSessionSummary();
 * 
 * // Reset for new test session
 * this.metricsService.resetSession();
 * ```
 * 
 * INTEGRATION:
 * - Wraps around existing Firestore operations
 * - Provides console summaries and debug info
 * - Enables before/after optimization comparisons
 */

import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../ssr';

export type FirebaseOperation = 'read' | 'write' | 'delete' | 'batch-write' | 'transaction';
export type RequestSource = 'cache' | 'firebase';

export interface FirebaseCallMetrics {
  operation: FirebaseOperation;
  collection: string;
  timestamp: number;
  callId: string;
  source?: RequestSource;
  requestIndex?: number;
}

export interface SessionSummary {
  totalCalls: number;
  breakdown: Record<string, number>;
  operationBreakdown: Record<FirebaseOperation, number>;
  sourceBreakdown: Record<RequestSource, number>;
  cacheHitRate: number;
  sessionDuration: number;
  sessionStart: number;
  callsPerMinute: number;
  mostActiveCollection: string;
  recentCalls: FirebaseCallMetrics[];
}

export interface SessionComparison {
  callReduction: number;
  percentReduction: number;
  mostImprovedCollections: Array<{ collection: string; reduction: number }>;
  summary: string;
}

/**
 * Service for tracking and analyzing Firebase operation performance.
 * 
 * This service provides comprehensive monitoring of Firebase operations to help
 * identify optimization opportunities and measure performance improvements.
 * 
 * Features:
 * - Real-time operation tracking with detailed metrics
 * - Session-based measurement for A/B testing
 * - Cache hit rate monitoring
 * - Collection-specific usage analysis
 * - Milestone summaries and progress tracking
 * - Before/after comparison utilities
 * - Memory-efficient call history management
 * - SSR-safe browser event handling
 * 
 * Use cases:
 * - Performance optimization measurement
 * - Firebase cost monitoring
 * - Cache effectiveness analysis
 * - Development debugging
 * - Production monitoring
 * - A/B testing of optimization strategies
 * 
 * Example usage:
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class DataService extends FirestoreCrudService<User> {
 *   private readonly metrics = inject(FirebaseMetricsService);
 *   
 *   async getUsers(): Promise<User[]> {
 *     this.metrics.trackCall('read', 'users', 'Getting all users');
 *     return super.getAll();
 *   }
 * }
 * ```
 * 
 * Performance testing workflow:
 * ```typescript
 * // Reset metrics before test
 * metricsService.resetSession('Optimization test');
 * 
 * // Perform operations...
 * await userService.loadUsers();
 * await postService.loadPosts();
 * 
 * // Get results
 * const summary = metricsService.getSessionSummary();
 * console.log(`Total calls: ${summary.totalCalls}`);
 * console.log(`Cache hit rate: ${summary.cacheHitRate}%`);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FirebaseMetricsService {
  private readonly platform = inject(SsrPlatformService);
  
  // Session tracking
  private sessionCalls = new Map<string, number>();
  private operationCalls = new Map<FirebaseOperation, number>();
  private sourceCalls = new Map<RequestSource, number>();
  private sessionStart = Date.now();
  private callHistory: FirebaseCallMetrics[] = [];
  private callCounter = 0;
  private requestIndex = 0;

  // Configuration
  private readonly MAX_HISTORY = 100; // Keep last 100 calls for analysis

  constructor() {
    console.log('🔥 [FirebaseMetrics] Session started - tracking Firebase operations');
    this.logSessionInfo();
    
    // Reset on page unload and show summary - only in browser
    this.platform.onlyOnBrowser(() => {
      const window = this.platform.getWindow();
      window?.addEventListener('beforeunload', () => {
        this.logSessionSummary('Session ending');
      });
    });
  }

  /**
   * Track a Firebase operation call
   * @param operation - Type of Firebase operation
   * @param collection - Collection name being accessed
   * @param details - Optional additional details for debugging
   * @param source - Whether this was served from cache or Firebase
   */
  trackCall(operation: FirebaseOperation, collection: string, details?: string, source: RequestSource = 'firebase'): void {
    const requestIdx = ++this.requestIndex;
    const callId = `${operation}-${collection}-${++this.callCounter}`;
    const timestamp = Date.now();
    
    // Update session counters
    const key = `${operation}:${collection}`;
    this.sessionCalls.set(key, (this.sessionCalls.get(key) || 0) + 1);
    this.operationCalls.set(operation, (this.operationCalls.get(operation) || 0) + 1);
    this.sourceCalls.set(source, (this.sourceCalls.get(source) || 0) + 1);
    
    // Add to call history
    const callMetrics: FirebaseCallMetrics = {
      operation,
      collection,
      timestamp,
      callId,
      source,
      requestIndex: requestIdx
    };
    
    this.callHistory.push(callMetrics);
    
    // Keep history size manageable
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory.shift();
    }
    
    // Enhanced logging with source and request index
    const sourceIcon = source === 'cache' ? '🎯' : '🔥';
    const sourceLabel = source === 'cache' ? 'CACHE' : 'FIREBASE';
    console.log(`${sourceIcon} [${sourceLabel}] #${requestIdx} ${operation.toUpperCase()} ${collection}${details ? ` (${details})` : ''} [${callId}]`);
    
    // Log milestone summaries
    const totalCalls = Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);
    if (totalCalls % 10 === 0) {
      this.logMilestoneSummary(totalCalls);
    }
  }

  /**
   * Get comprehensive session summary
   */
  getSessionSummary(): SessionSummary {
    const now = Date.now();
    const sessionDuration = now - this.sessionStart;
    const totalCalls = Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);
    
    // Build collection breakdown
    const breakdown: Record<string, number> = {};
    this.sessionCalls.forEach((count, key) => {
      breakdown[key] = count;
    });
    
    // Build operation breakdown
    const operationBreakdown: Record<FirebaseOperation, number> = {
      'read': 0,
      'write': 0,
      'delete': 0,
      'batch-write': 0,
      'transaction': 0
    };
    this.operationCalls.forEach((count, operation) => {
      operationBreakdown[operation] = count;
    });

    // Build source breakdown
    const sourceBreakdown: Record<RequestSource, number> = {
      'cache': 0,
      'firebase': 0
    };
    this.sourceCalls.forEach((count, source) => {
      sourceBreakdown[source] = count;
    });

    // Calculate cache hit rate
    const cacheHits = sourceBreakdown.cache || 0;
    const firebaseHits = sourceBreakdown.firebase || 0;
    const cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;
    
    // Find most active collection
    let mostActiveCollection = 'none';
    let maxCalls = 0;
    Object.entries(breakdown).forEach(([key, count]) => {
      if (count > maxCalls) {
        maxCalls = count;
        mostActiveCollection = key;
      }
    });
    
    // Calculate calls per minute
    const callsPerMinute = sessionDuration > 0 ? (totalCalls / (sessionDuration / 60000)) : 0;
    
    return {
      totalCalls,
      breakdown,
      operationBreakdown,
      sourceBreakdown,
      cacheHitRate,
      sessionDuration,
      sessionStart: this.sessionStart,
      callsPerMinute,
      mostActiveCollection,
      recentCalls: [...this.callHistory].slice(-10) // Last 10 calls
    };
  }

  /**
   * Reset session metrics (for testing optimization)
   */
  resetSession(reason = 'Manual reset'): void {
    console.log(`🔥 [FirebaseMetrics] 🔄 Resetting session metrics: ${reason}`);
    
    // Log final summary before reset
    this.logSessionSummary('Pre-reset summary');
    
    // Clear all counters
    this.sessionCalls.clear();
    this.operationCalls.clear();
    this.sourceCalls.clear();
    this.callHistory = [];
    this.callCounter = 0;
    this.requestIndex = 0;
    this.sessionStart = Date.now();
    
    console.log('🔥 [FirebaseMetrics] ✅ Session reset complete - new tracking session started');
    this.logSessionInfo();
  }

  /**
   * Log detailed session summary
   */
  logSessionSummary(title = 'Session Summary'): void {
    const summary = this.getSessionSummary();
    
    console.log(`🔥 [FirebaseMetrics] === ${title.toUpperCase()} ===`);
    console.log(`🔥 [FirebaseMetrics] Total calls: ${summary.totalCalls}`);
    console.log(`🔥 [FirebaseMetrics] Cache hit rate: ${summary.cacheHitRate.toFixed(1)}%`);
    console.log(`🔥 [FirebaseMetrics] Session duration: ${(summary.sessionDuration / 1000).toFixed(1)}s`);
    console.log(`🔥 [FirebaseMetrics] Calls per minute: ${summary.callsPerMinute.toFixed(1)}`);
    console.log(`🔥 [FirebaseMetrics] Most active: ${summary.mostActiveCollection}`);
    
    if (summary.totalCalls > 0) {
      console.log('🔥 [FirebaseMetrics] Operation breakdown:', summary.operationBreakdown);
      console.log('🔥 [FirebaseMetrics] Source breakdown:', summary.sourceBreakdown);
      console.log('🔥 [FirebaseMetrics] Collection breakdown:', summary.breakdown);
      
      if (summary.recentCalls.length > 0) {
        console.log('🔥 [FirebaseMetrics] Recent calls:');
        summary.recentCalls.forEach(call => {
          const sourceIcon = call.source === 'cache' ? '🎯' : '🔥';
          const index = call.requestIndex ? `#${call.requestIndex}` : '';
          console.log(`  ${sourceIcon} ${index} ${call.operation} ${call.collection} [${call.callId}]`);
        });
      }
    }
    
    console.log('🔥 [FirebaseMetrics] ========================');
  }

  /**
   * Get current call count for quick checks
   */
  getCurrentCallCount(): number {
    return Array.from(this.operationCalls.values()).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Get breakdown by collection (for identifying optimization targets)
   */
  getCollectionBreakdown(): Array<{ collection: string; totalCalls: number; operations: Record<FirebaseOperation, number> }> {
    const collectionMap = new Map<string, Record<FirebaseOperation, number>>();
    
    this.sessionCalls.forEach((count, key) => {
      const [operation, collection] = key.split(':') as [FirebaseOperation, string];
      
      if (!collectionMap.has(collection)) {
        collectionMap.set(collection, {} as Record<FirebaseOperation, number>);
      }
      
      const ops = collectionMap.get(collection)!;
      ops[operation] = (ops[operation] || 0) + count;
    });
    
    return Array.from(collectionMap.entries()).map(([collection, operations]) => ({
      collection,
      totalCalls: Object.values(operations).reduce((sum, count) => sum + count, 0),
      operations
    })).sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * Get optimization recommendations based on current metrics
   */
  getOptimizationRecommendations(): string[] {
    const summary = this.getSessionSummary();
    const recommendations: string[] = [];

    // Low cache hit rate
    if (summary.cacheHitRate < 50 && summary.totalCalls > 10) {
      recommendations.push(`Consider caching strategies - current hit rate is ${summary.cacheHitRate.toFixed(1)}%`);
    }

    // High read frequency
    const readPercentage = (summary.operationBreakdown.read / summary.totalCalls) * 100;
    if (readPercentage > 80) {
      recommendations.push(`${readPercentage.toFixed(1)}% of operations are reads - consider batch operations or data denormalization`);
    }

    // Frequent collection access
    const breakdown = this.getCollectionBreakdown();
    const topCollection = breakdown[0];
    if (topCollection && topCollection.totalCalls > summary.totalCalls * 0.5) {
      recommendations.push(`Collection '${topCollection.collection}' accounts for ${((topCollection.totalCalls / summary.totalCalls) * 100).toFixed(1)}% of calls - consider optimization`);
    }

    // High call frequency
    if (summary.callsPerMinute > 60) {
      recommendations.push(`High call frequency: ${summary.callsPerMinute.toFixed(1)} calls/minute - consider debouncing or batching`);
    }

    return recommendations;
  }

  /**
   * Log session startup info
   */
  private logSessionInfo(): void {
    console.log(`🔥 [FirebaseMetrics] 🚀 New session started at ${new Date().toISOString()}`);
    console.log('🔥 [FirebaseMetrics] Tracking: reads, writes, deletes, batch operations');
    console.log('🔥 [FirebaseMetrics] Use resetSession() to start fresh measurement');
  }

  /**
   * Log milestone summaries (every 10 calls)
   */
  private logMilestoneSummary(totalCalls: number): void {
    const duration = Date.now() - this.sessionStart;
    const callsPerMinute = (totalCalls / (duration / 60000)).toFixed(1);
    
    console.log(`🔥 [FirebaseMetrics] 📊 Milestone: ${totalCalls} calls (${callsPerMinute}/min)`);
  }

  /**
   * Compare two session summaries (useful for before/after optimization)
   */
  static compareSessions(before: SessionSummary, after: SessionSummary): SessionComparison {
    const callReduction = before.totalCalls - after.totalCalls;
    const percentReduction = before.totalCalls > 0 ? (callReduction / before.totalCalls) * 100 : 0;
    
    // Find collections with biggest improvements
    const collectionImprovements: Array<{ collection: string; reduction: number }> = [];
    
    Object.keys(before.breakdown).forEach(key => {
      const beforeCount = before.breakdown[key] || 0;
      const afterCount = after.breakdown[key] || 0;
      const reduction = beforeCount - afterCount;
      
      if (reduction > 0) {
        collectionImprovements.push({ collection: key, reduction });
      }
    });
    
    collectionImprovements.sort((a, b) => b.reduction - a.reduction);
    
    const summary = callReduction > 0 
      ? `🎉 Reduced Firebase calls by ${callReduction} (${percentReduction.toFixed(1)}%)`
      : callReduction < 0 
        ? `⚠️ Firebase calls increased by ${Math.abs(callReduction)} (${Math.abs(percentReduction).toFixed(1)}%)`
        : '📊 No change in Firebase calls';
    
    return {
      callReduction,
      percentReduction,
      mostImprovedCollections: collectionImprovements.slice(0, 5),
      summary
    };
  }
}