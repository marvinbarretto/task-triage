import { Injectable, inject } from '@angular/core';
import { SsrPlatformService } from '../ssr/platform.service';
import { FirebaseOperation, RequestSource, FirebaseCallMetrics, SessionSummary } from './types';

@Injectable({
  providedIn: 'root',
})
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
  static compareSessions(before: SessionSummary, after: SessionSummary): {
    callReduction: number;
    percentReduction: number;
    mostImprovedCollections: Array<{ collection: string; reduction: number }>;
    summary: string;
  } {
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