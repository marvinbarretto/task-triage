export type FirebaseOperation = 'read' | 'write' | 'delete' | 'batch-write' | 'transaction';

export type RequestSource = 'cache' | 'firebase';

export interface FirebaseCallMetrics {
  operation: FirebaseOperation;
  collection: string;
  timestamp: number;
  callId: string;
  source: RequestSource;
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