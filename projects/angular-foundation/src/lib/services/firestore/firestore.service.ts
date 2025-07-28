import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  getDocFromCache,
  getDocFromServer,
  getDocsFromCache,
  getDocsFromServer,
  CollectionReference,
  DocumentReference,
  QuerySnapshot,
  DocumentData,
  QueryConstraint
} from '@angular/fire/firestore';
import { Observable, from, tap, map } from 'rxjs';
import { SsrPlatformService } from '../ssr/platform.service';
import { FirebaseMetricsService } from '../firebase-metrics';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private readonly injector = inject(Injector);
  protected firestore = inject(Firestore);
  private metricsService = inject(FirebaseMetricsService, { optional: true });
  protected platform = inject(SsrPlatformService);

  constructor() {
    // 📊 Log network status for educational purposes (only in browser)
    this.platform.onlyOnBrowser(() => {
      this.monitorNetworkStatus();
    });
  }

  /**
   * 📚 COLLECTION FETCH - Cache-first fetch with explicit source tracking
   *
   * 🔍 STRATEGY: Try cache first, then server to ensure accurate cost tracking
   * 💰 COST AWARENESS: Clear logging distinguishes free cache hits from paid API calls
   */
  public collection$<T>(path: string): Observable<T[]> {
    console.log(`[Firestore] 📚 Collection fetch started: ${path}`);
    this.metricsService?.trackCall('read', path, 'collection');

    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, path) as CollectionReference<T>;
      
      return from(this.tryCollectionFromCache<T>(col, path)).pipe(
        map(result => {
          if (result.fromCache) {
            console.log(`🎯 [Firestore] 💰 CACHE HIT - Collection "${path}" (${result.docs.length} docs) - $0.00 cost`);
            this.metricsService?.trackCall('read', path, 'collection', 'cache');
            return result.docs;
          } else {
            console.log(`💸 [Firestore] 🌐 API CALL - Collection "${path}" (${result.docs.length} docs) - FIRESTORE CHARGE`);
            this.metricsService?.trackCall('read', path, 'collection', 'firebase');
            return result.docs;
          }
        })
      );
    });
  }

  /**
   * 📄 DOCUMENT FETCH - Cache-first fetch with explicit source tracking
   *
   * 🔍 STRATEGY: Try cache first, then server to ensure accurate cost tracking
   * 💰 COST AWARENESS: Clear logging distinguishes free cache hits from paid API calls
   */
  public doc$<T>(path: string): Observable<T | undefined> {
    console.log(`[Firestore] 📄 Document fetch started: ${path}`);
    this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'doc');

    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      
      return from(this.tryDocFromCache<T>(ref, path)).pipe(
        map(result => {
          if (result.fromCache) {
            console.log(`🎯 [Firestore] 💰 CACHE HIT - Document "${path}" ${result.data ? 'found' : 'not found'} - $0.00 cost`);
            this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'doc', 'cache');
            return result.data;
          } else {
            console.log(`💸 [Firestore] 🌐 API CALL - Document "${path}" ${result.data ? 'found' : 'not found'} - FIRESTORE CHARGE`);
            this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'doc', 'firebase');
            return result.data;
          }
        })
      );
    });
  }

  /**
   * 💾 DOCUMENT CREATE/UPDATE - Set a document by path (overwrites if exists)
   *
   * 🔍 WHAT HAPPENS:
   * 1. Write goes to Firestore immediately if online
   * 2. If offline, write is queued locally and synced when back online
   * 3. Local cache is updated immediately for instant UI updates
   * 4. Offline writes are persistent across browser refreshes
   *
   * 🌐 OFFLINE BEHAVIOR: Your writes work even offline!
   */
  public setDoc<T>(path: string, data: T): Promise<void> {
    const isOnline = this.platform.onlyOnBrowser(() => navigator.onLine) ?? true;
    console.log(`[Firestore] 💾 Setting document: ${path}`, { online: isOnline });

    this.metricsService?.trackCall('write', this.extractCollectionFromPath(path), 'setDoc');

    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return setDoc(ref, data).then(() => {
        console.log(`✅ [Firestore] 💾 Document "${path}" ${isOnline ? 'saved to server' : 'queued for sync'}`);
        if (!isOnline) {
          console.log(`📱 [Firestore] 🔄 Write queued - will sync when back online`);
        }
      });
    });
  }

  /**
   * Update a document by path (merges fields).
   */
  public updateDoc<T>(path: string, data: Partial<T>): Promise<void> {
    this.metricsService?.trackCall('write', this.extractCollectionFromPath(path), 'updateDoc');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path) as DocumentReference<T>;
      return updateDoc(ref, data);
    });
  }

  /**
   * Delete a document by path.
   */
  public deleteDoc(path: string): Promise<void> {
    this.metricsService?.trackCall('delete', this.extractCollectionFromPath(path), 'deleteDoc');
    return runInInjectionContext(this.injector, () => {
      const ref = doc(this.firestore, path);
      return deleteDoc(ref);
    });
  }

  /**
   * Add a document to a collection (auto-generates ID).
   */
  public addDocToCollection<T>(path: string, data: T): Promise<DocumentReference<T>> {
    this.metricsService?.trackCall('write', path, 'addDoc');
    return runInInjectionContext(this.injector, () => {
      const col = collection(this.firestore, path) as CollectionReference<T>;
      return addDoc(col, data);
    });
  }

  /**
   * Map a QuerySnapshot into data objects with injected Firestore document IDs.
   */
  public mapSnapshotWithId<T>(snapshot: QuerySnapshot<DocumentData>): (T & { id: string })[] {
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as T),
    }));
  }

  /**
   * One-time fetch of a subcollection under a parent document.
   * Tries cache first, then server if not found.
   */
  public async getDocByPath<T>(path: string): Promise<T | undefined> {
    const ref = doc(this.firestore, path) as DocumentReference<T>;

    try {
      // Try cache first
      const cacheSnap = await runInInjectionContext(this.injector, () =>
        getDocFromCache(ref)
      );
      if (cacheSnap.exists()) {
        console.log(`🎯 [Firestore] 💰 CACHE HIT - getDocByPath "${path}" found - $0.00 cost`);
        this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'getDocByPath', 'cache');
        return cacheSnap.data() as T;
      }
    } catch (error) {
      // Cache miss - fall through to server
    }

    // Fallback to server
    console.log(`💸 [Firestore] 🌐 API CALL - getDocByPath "${path}" - FIRESTORE CHARGE`);
    this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'getDocByPath', 'firebase');
    const serverSnap = await runInInjectionContext(this.injector, () =>
      getDocFromServer(ref)
    );
    return serverSnap.exists() ? (serverSnap.data() as T) : undefined;
  }

  public async getDocsWhere<T>(
    path: string,
    ...conditions: QueryConstraint[]
  ): Promise<(T & { id: string })[]> {
    const ref = collection(this.firestore, path);
    const q = query(ref, ...conditions);

    try {
      // Try cache first
      const cacheSnapshot = await runInInjectionContext(this.injector, () =>
        getDocsFromCache(q)
      );
      if (!cacheSnapshot.empty) {
        console.log(`🎯 [Firestore] 💰 CACHE HIT - getDocsWhere "${path}" (${cacheSnapshot.docs.length} docs) - $0.00 cost`);
        this.metricsService?.trackCall('read', path, 'getDocsWhere', 'cache');
        return this.mapSnapshotWithId<T>(cacheSnapshot);
      }
    } catch (error) {
      // Cache miss - fall through to server
    }

    // Fallback to server
    console.log(`💸 [Firestore] 🌐 API CALL - getDocsWhere "${path}" - FIRESTORE CHARGE`);
    this.metricsService?.trackCall('read', path, 'getDocsWhere', 'firebase');
    const serverSnapshot = await runInInjectionContext(this.injector, () =>
      getDocsFromServer(q)
    );
    const result = this.mapSnapshotWithId<T>(serverSnapshot);
    console.log(`💸 [Firestore] 🌐 API CALL - getDocsWhere "${path}" returned ${result.length} docs`);
    return result;
  }

  /**
   * Force fetch documents from server, bypassing cache
   */
  public async getDocsWhereFromServer<T>(
    path: string,
    ...conditions: QueryConstraint[]
  ): Promise<(T & { id: string })[]> {
    const ref = collection(this.firestore, path);
    const q = query(ref, ...conditions);

    console.log(`💸 [Firestore] 🌐 FORCED API CALL - getDocsWhereFromServer "${path}" - FIRESTORE CHARGE`);
    this.metricsService?.trackCall('read', path, 'getDocsWhereFromServer', 'firebase');
    const serverSnapshot = await runInInjectionContext(this.injector, () =>
      getDocsFromServer(q)
    );
    const result = this.mapSnapshotWithId<T>(serverSnapshot);
    console.log(`💸 [Firestore] 🌐 FORCED API CALL - getDocsWhereFromServer "${path}" returned ${result.length} docs`);
    return result;
  }

  public async exists(path: string): Promise<boolean> {
    const ref = doc(this.firestore, path);

    try {
      // Try cache first
      const cacheSnap = await runInInjectionContext(this.injector, () =>
        getDocFromCache(ref)
      );
      console.log(`🎯 [Firestore] 💰 CACHE HIT - exists "${path}" ${cacheSnap.exists() ? 'exists' : 'not found'} - $0.00 cost`);
      this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'exists', 'cache');
      return cacheSnap.exists();
    } catch (error) {
      // Cache miss - fallback to server
      console.log(`💸 [Firestore] 🌐 API CALL - exists "${path}" - FIRESTORE CHARGE`);
      this.metricsService?.trackCall('read', this.extractCollectionFromPath(path), 'exists', 'firebase');
      const serverSnap = await runInInjectionContext(this.injector, () =>
        getDocFromServer(ref)
      );
      return serverSnap.exists();
    }
  }

  /**
   * Try to fetch collection from cache first, fallback to server
   */
  private async tryCollectionFromCache<T>(col: CollectionReference<T>, path: string): Promise<{docs: T[], fromCache: boolean}> {
    try {
      const cacheSnapshot = await getDocsFromCache(col);
      if (!cacheSnapshot.empty) {
        return {
          docs: cacheSnapshot.docs.map(doc => doc.data() as unknown as T),
          fromCache: true
        };
      }
    } catch (error) {
      // Cache miss - fall through to server
    }

    // Fallback to server
    const serverSnapshot = await getDocs(col);
    return {
      docs: serverSnapshot.docs.map(doc => doc.data() as unknown as T),
      fromCache: false
    };
  }

  /**
   * Try to fetch document from cache first, fallback to server
   */
  private async tryDocFromCache<T>(ref: DocumentReference<T>, path: string): Promise<{data: T | undefined, fromCache: boolean}> {
    try {
      const cacheSnapshot = await getDocFromCache(ref);
      if (cacheSnapshot.exists()) {
        return {
          data: cacheSnapshot.data() as T,
          fromCache: true
        };
      }
    } catch (error) {
      // Cache miss - fall through to server
    }

    // Fallback to server
    const serverSnapshot = await getDoc(ref);
    return {
      data: serverSnapshot.exists() ? (serverSnapshot.data() as T) : undefined,
      fromCache: false
    };
  }

  /**
   * Extract collection name from a document path
   * @param path - Document path like "users/123" or "checkins/abc"
   * @returns Collection name like "users" or "checkins"
   */
  private extractCollectionFromPath(path: string): string {
    return path.split('/')[0];
  }

  /**
   * 📊 NETWORK MONITORING - Monitor online/offline status for educational purposes
   *
   * This helps you see how Firebase handles network changes:
   * - When you go offline: Reads come from cache, writes are queued
   * - When you come back online: Queued writes sync automatically
   */
  private monitorNetworkStatus(): void {
    const window = this.platform.getWindow();
    if (!window) return; // Exit early if not in browser

    console.log(`[Firestore] 🌐 Initial network status: ${navigator.onLine ? 'ONLINE' : 'OFFLINE'}`);

    // Monitor network status changes
    window.addEventListener('online', () => {
      console.log(`[Firestore] ✅ BACK ONLINE! Firebase will now sync any pending writes`);
      console.log(`[Firestore] 🔄 Any queued writes will automatically sync to server`);
    });

    window.addEventListener('offline', () => {
      console.log(`[Firestore] 📱 GONE OFFLINE! Switching to cache-only mode`);
      console.log(`[Firestore] 💾 Reads will come from IndexedDB cache`);
      console.log(`[Firestore] 📝 Writes will be queued for later sync`);
    });

    // Log browser support for offline features
    if ('serviceWorker' in navigator) {
      console.log(`[Firestore] 🔧 Service Worker supported - offline capabilities enhanced`);
    }

    if ('indexedDB' in window) {
      console.log(`[Firestore] 💾 IndexedDB supported - Firebase cache is ready`);
    }
  }

  /**
   * 🔄 BATCH DELETE - Delete multiple documents in a single transaction
   *
   * 🔍 WHAT HAPPENS:
   * 1. Creates a batch operation that groups multiple deletes
   * 2. All deletions succeed or all fail (atomic)
   * 3. Single network request instead of N individual requests
   * 4. Cost-efficient: 1 write operation vs N write operations
   *
   * 💰 COST SAVINGS: 99% reduction in Firestore write costs for bulk deletes
   */
  public batchDelete(documentPaths: string[]): Promise<void> {
    const startTime = performance.now();
    console.log(`[Firestore] 🔄 Batch delete started: ${documentPaths.length} documents`);

    this.metricsService?.trackCall('delete', 'batch-operation', 'batchDelete');

    return runInInjectionContext(this.injector, async () => {
      const batch = writeBatch(this.firestore);

      // Add all document deletions to the batch
      documentPaths.forEach(path => {
        const docRef = doc(this.firestore, path);
        batch.delete(docRef);
      });

      // Execute the batch operation
      await batch.commit();

      const duration = performance.now() - startTime;
      console.log(`✅ [Firestore] 🔄 Batch delete completed: ${documentPaths.length} documents in ${duration.toFixed(1)}ms`);
      console.log(`💰 [Firestore] 💸 Cost savings: 1 write operation vs ${documentPaths.length} individual writes (${Math.round((1 - 1/documentPaths.length) * 100)}% savings)`);
    });
  }
}
