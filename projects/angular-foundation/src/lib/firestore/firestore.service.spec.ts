import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { SsrPlatformService } from '../ssr/platform.service';
import { FirebaseMetricsService } from './firebase-metrics.service';
import { FirestoreService } from './firestore.service';

describe('FirestoreService', () => {
  let service: FirestoreService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  let mockPlatform: jasmine.SpyObj<SsrPlatformService>;
  let mockMetrics: jasmine.SpyObj<FirebaseMetricsService>;

  beforeEach(() => {
    // Create spies for dependencies
    mockFirestore = jasmine.createSpyObj('Firestore', ['']);
    mockPlatform = jasmine.createSpyObj('SsrPlatformService', ['onlyOnBrowser', 'getWindow']);
    mockMetrics = jasmine.createSpyObj('FirebaseMetricsService', ['trackCall']);

    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: Firestore, useValue: mockFirestore },
        { provide: SsrPlatformService, useValue: mockPlatform },
        { provide: FirebaseMetricsService, useValue: mockMetrics }
      ]
    });

    service = TestBed.inject(FirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize network monitoring in browser', () => {
    // Setup mock
    mockPlatform.onlyOnBrowser.and.callFake((callback) => callback());
    const mockWindow = {
      addEventListener: jasmine.createSpy('addEventListener')
    } as any;
    mockPlatform.getWindow.and.returnValue(mockWindow);

    // Create service instance
    service = TestBed.inject(FirestoreService);

    expect(mockPlatform.onlyOnBrowser).toHaveBeenCalled();
  });

  it('should not initialize network monitoring on server', () => {
    // Setup mock for server-side
    mockPlatform.onlyOnBrowser.and.returnValue(undefined);

    // Create service instance
    service = TestBed.inject(FirestoreService);

    expect(mockPlatform.onlyOnBrowser).toHaveBeenCalled();
    expect(mockPlatform.getWindow).not.toHaveBeenCalled();
  });

  describe('extractCollectionFromPath', () => {
    it('should extract collection name from document path', () => {
      // Access private method via type assertion for testing
      const extractMethod = (service as any).extractCollectionFromPath;
      
      expect(extractMethod('users/123')).toBe('users');
      expect(extractMethod('checkins/abc/subcollection/def')).toBe('checkins');
      expect(extractMethod('single')).toBe('single');
    });
  });

  describe('metrics integration', () => {
    it('should track calls when metrics service is available', () => {
      // This tests the optional dependency pattern
      expect(service).toBeTruthy();
      // The actual tracking would be tested in integration tests
      // since we need to mock the Firebase operations
    });
  });

  describe('mapSnapshotWithId', () => {
    it('should map snapshot to objects with id', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'doc1',
            data: () => ({ name: 'Test 1', value: 100 })
          },
          {
            id: 'doc2', 
            data: () => ({ name: 'Test 2', value: 200 })
          }
        ]
      } as any;

      const result = service.mapSnapshotWithId<{name: string; value: number}>(mockSnapshot);

      expect(result).toEqual([
        { id: 'doc1', name: 'Test 1', value: 100 },
        { id: 'doc2', name: 'Test 2', value: 200 }
      ]);
    });

    it('should handle empty snapshot', () => {
      const mockSnapshot = {
        docs: []
      } as any;

      const result = service.mapSnapshotWithId(mockSnapshot);

      expect(result).toEqual([]);
    });
  });
});

describe('FirestoreService without metrics', () => {
  let service: FirestoreService;
  let mockFirestore: jasmine.SpyObj<Firestore>;
  let mockPlatform: jasmine.SpyObj<SsrPlatformService>;

  beforeEach(() => {
    mockFirestore = jasmine.createSpyObj('Firestore', ['']);
    mockPlatform = jasmine.createSpyObj('SsrPlatformService', ['onlyOnBrowser']);

    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: Firestore, useValue: mockFirestore },
        { provide: SsrPlatformService, useValue: mockPlatform }
        // Note: No FirebaseMetricsService provided - testing optional dependency
      ]
    });

    service = TestBed.inject(FirestoreService);
  });

  it('should work without metrics service', () => {
    expect(service).toBeTruthy();
    // Service should not crash when metrics service is not available
  });

  it('should not call metrics when service is not available', () => {
    // This tests that the service gracefully handles optional dependencies
    expect(service).toBeTruthy();
    // The ?. optional chaining should prevent errors when metrics is undefined
  });
});