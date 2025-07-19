import { TestBed } from '@angular/core/testing';
import { SsrPlatformService } from '../ssr/platform.service';
import { FirebaseMetricsService } from './firebase-metrics.service';
import { FirebaseOperation, RequestSource } from './types';

describe('FirebaseMetricsService', () => {
  let service: FirebaseMetricsService;
  let mockPlatform: jasmine.SpyObj<SsrPlatformService>;
  let consoleSpy: jasmine.Spy;

  beforeEach(() => {
    mockPlatform = jasmine.createSpyObj('SsrPlatformService', ['onlyOnBrowser', 'getWindow']);
    consoleSpy = spyOn(console, 'log');

    TestBed.configureTestingModule({
      providers: [
        FirebaseMetricsService,
        { provide: SsrPlatformService, useValue: mockPlatform }
      ]
    });

    service = TestBed.inject(FirebaseMetricsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with browser monitoring', () => {
    const mockWindow = {
      addEventListener: jasmine.createSpy('addEventListener')
    } as any;
    
    mockPlatform.onlyOnBrowser.and.callFake((callback) => callback());
    mockPlatform.getWindow.and.returnValue(mockWindow);

    // Create new instance to test constructor
    service = TestBed.inject(FirebaseMetricsService);

    expect(mockPlatform.onlyOnBrowser).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('🔥 [FirebaseMetrics] Session started - tracking Firebase operations');
  });

  describe('trackCall', () => {
    beforeEach(() => {
      // Reset console spy for each test
      consoleSpy.calls.reset();
    });

    it('should track Firebase operations with separate counters', () => {
      service.trackCall('read', 'users', 'collection', 'firebase');
      service.trackCall('read', 'posts', 'doc', 'cache');
      service.trackCall('write', 'users', 'setDoc', 'firebase');

      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🔥 \[FIREBASE\] #1 READ users \(collection\) \[.*\] \(req #1\)/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🎯 \[CACHE\] #1 READ posts \(doc\) \[.*\] \(req #2\)/)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🔥 \[FIREBASE\] #2 WRITE users \(setDoc\) \[.*\] \(req #3\)/)
      );
    });

    it('should increment cache and Firebase counters separately', () => {
      // Track multiple cache hits
      service.trackCall('read', 'users', 'doc1', 'cache');
      service.trackCall('read', 'users', 'doc2', 'cache');
      
      // Track Firebase operations
      service.trackCall('read', 'posts', 'collection', 'firebase');
      service.trackCall('write', 'users', 'setDoc', 'firebase');

      const calls = consoleSpy.calls.allArgs();
      
      // Find the cache calls
      const cacheCalls = calls.filter(call => 
        call[0].includes('🎯 [CACHE]')
      );
      
      // Find the Firebase calls
      const firebaseCalls = calls.filter(call => 
        call[0].includes('🔥 [FIREBASE]')
      );

      expect(cacheCalls.length).toBe(2);
      expect(firebaseCalls.length).toBe(2);
      
      // Check that cache counter increments correctly
      expect(cacheCalls[0][0]).toContain('#1');
      expect(cacheCalls[1][0]).toContain('#2');
      
      // Check that Firebase counter increments correctly
      expect(firebaseCalls[0][0]).toContain('#1');
      expect(firebaseCalls[1][0]).toContain('#2');
    });

    it('should default to firebase source when not specified', () => {
      service.trackCall('read', 'users', 'collection');

      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🔥 \[FIREBASE\] #1 READ users \(collection\) \[.*\] \(req #1\)/)
      );
    });

    it('should handle milestone logging', () => {
      // Track 10 operations to trigger milestone
      for (let i = 0; i < 10; i++) {
        service.trackCall('read', 'users', `doc${i}`);
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🔥 \[FirebaseMetrics\] 📊 Milestone: 10 calls/)
      );
    });

    it('should maintain call history', () => {
      service.trackCall('read', 'users', 'collection', 'firebase');
      service.trackCall('write', 'posts', 'setDoc', 'cache');

      const summary = service.getSessionSummary();
      
      expect(summary.recentCalls.length).toBe(2);
      expect(summary.recentCalls[0].operation).toBe('read');
      expect(summary.recentCalls[0].collection).toBe('users');
      expect(summary.recentCalls[0].source).toBe('firebase');
      
      expect(summary.recentCalls[1].operation).toBe('write');
      expect(summary.recentCalls[1].collection).toBe('posts');
      expect(summary.recentCalls[1].source).toBe('cache');
    });
  });

  describe('getSessionSummary', () => {
    it('should return accurate session metrics', () => {
      // Track various operations
      service.trackCall('read', 'users', 'collection', 'firebase');
      service.trackCall('read', 'users', 'doc', 'cache');
      service.trackCall('write', 'posts', 'setDoc', 'firebase');
      service.trackCall('read', 'posts', 'collection', 'cache');

      const summary = service.getSessionSummary();

      expect(summary.totalCalls).toBe(4);
      expect(summary.sourceBreakdown.cache).toBe(2);
      expect(summary.sourceBreakdown.firebase).toBe(2);
      expect(summary.cacheHitRate).toBe(50); // 2 cache / 4 total = 50%
      
      expect(summary.operationBreakdown.read).toBe(3);
      expect(summary.operationBreakdown.write).toBe(1);
    });

    it('should calculate cache hit rate correctly', () => {
      // All cache hits
      service.trackCall('read', 'users', 'doc1', 'cache');
      service.trackCall('read', 'users', 'doc2', 'cache');

      let summary = service.getSessionSummary();
      expect(summary.cacheHitRate).toBe(100);

      // Add Firebase call
      service.trackCall('read', 'posts', 'collection', 'firebase');

      summary = service.getSessionSummary();
      expect(summary.cacheHitRate).toBeCloseTo(66.67, 1); // 2 cache / 3 total
    });

    it('should identify most active collection', () => {
      service.trackCall('read', 'users', 'doc1');
      service.trackCall('read', 'users', 'doc2');
      service.trackCall('read', 'users', 'doc3');
      service.trackCall('read', 'posts', 'doc1');

      const summary = service.getSessionSummary();
      expect(summary.mostActiveCollection).toBe('read:users');
    });
  });

  describe('resetSession', () => {
    it('should clear all metrics and restart counters', () => {
      // Track some operations
      service.trackCall('read', 'users', 'collection', 'firebase');
      service.trackCall('read', 'posts', 'doc', 'cache');

      // Reset
      service.resetSession('Testing reset');

      // Verify reset
      const summary = service.getSessionSummary();
      expect(summary.totalCalls).toBe(0);
      expect(summary.recentCalls.length).toBe(0);

      // Track new operation after reset
      service.trackCall('read', 'newCollection', 'doc', 'cache');

      // Should start counting from 1 again
      expect(consoleSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/🎯 \[CACHE\] #1 READ newCollection/)
      );
    });
  });

  describe('getCollectionBreakdown', () => {
    it('should return collection breakdown sorted by total calls', () => {
      service.trackCall('read', 'users', 'doc1');
      service.trackCall('read', 'users', 'doc2');
      service.trackCall('write', 'users', 'setDoc');
      service.trackCall('read', 'posts', 'doc1');

      const breakdown = service.getCollectionBreakdown();

      expect(breakdown.length).toBe(2);
      expect(breakdown[0].collection).toBe('users');
      expect(breakdown[0].totalCalls).toBe(3);
      expect(breakdown[0].operations.read).toBe(2);
      expect(breakdown[0].operations.write).toBe(1);

      expect(breakdown[1].collection).toBe('posts');
      expect(breakdown[1].totalCalls).toBe(1);
      expect(breakdown[1].operations.read).toBe(1);
    });
  });

  describe('static compareSessions', () => {
    it('should compare two session summaries', () => {
      const before = {
        totalCalls: 10,
        breakdown: { 'read:users': 5, 'read:posts': 3, 'write:users': 2 }
      } as any;

      const after = {
        totalCalls: 6,
        breakdown: { 'read:users': 3, 'read:posts': 2, 'write:users': 1 }
      } as any;

      const comparison = FirebaseMetricsService.compareSessions(before, after);

      expect(comparison.callReduction).toBe(4);
      expect(comparison.percentReduction).toBe(40);
      expect(comparison.summary).toContain('Reduced Firebase calls by 4 (40.0%)');
      expect(comparison.mostImprovedCollections[0].collection).toBe('read:users');
      expect(comparison.mostImprovedCollections[0].reduction).toBe(2);
    });
  });
});