import { Injectable } from '@angular/core';
import { where } from '@angular/fire/firestore';
import { FirestoreService } from '../firestore';

/**
 * Abstract CRUD service for Firestore collections with enhanced functionality.
 * 
 * This service extends the base FirestoreService to provide a complete CRUD
 * interface for working with Firestore collections in a type-safe manner.
 * 
 * Features:
 * - Type-safe CRUD operations
 * - Bulk operations for performance
 * - Server-side data fetching (bypassing cache)
 * - Pagination support
 * - Document existence checking
 * - Error handling with descriptive messages
 * - Consistent API across all collections
 * - Automatic path validation
 * 
 * Usage:
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   createdAt: Date;
 * }
 * 
 * @Injectable({ providedIn: 'root' })
 * export class UserService extends FirestoreCrudService<User> {
 *   protected path = 'users';
 * 
 *   // Add custom methods if needed
 *   async getUsersByDomain(domain: string): Promise<User[]> {
 *     return this.getDocsWhere<User>(this.path, ['email', 'in', [`@${domain}`]]);
 *   }
 * }
 * ```
 * 
 * Advanced usage with authentication:
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class UserPostsService extends FirestoreCrudService<Post> {
 *   private readonly authStore = inject(AuthStore);
 *   protected get path(): string {
 *     const userId = this.authStore.user()?.uid;
 *     if (!userId) throw new Error('User not authenticated');
 *     return `users/${userId}/posts`;
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export abstract class FirestoreCrudService<T extends { id: string }> extends FirestoreService {
  protected abstract path: string;

  // ===================================
  // READ OPERATIONS
  // ===================================

  /**
   * Get all documents in the collection
   */
  getAll(): Promise<T[]> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }
    return this.getDocsWhere<T>(this.path);
  }

  /**
   * Get all documents from server (bypassing cache)
   */
  getAllFromServer(): Promise<T[]> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }
    console.log(`[FirestoreCrudService] 🌐 Force fetching from server: ${this.path}`);
    return this.getDocsWhereFromServer<T>(this.path);
  }

  /**
   * Get a single document by ID
   */
  async getById(id: string): Promise<T | null> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }

    const docPath = `${this.path}/${id}`;
    const doc = await this.getDocByPath<T>(docPath);
    return doc || null;
  }

  /**
   * Check if a document exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }

    const doc = await this.getById(id);
    return doc !== null;
  }

  /**
   * Get documents that match a condition
   */
  async getWhere(field: keyof T, operator: any, value: any): Promise<T[]> {
    if (!this.path) {
      throw new Error('[FirestoreCrudService] "path" is not set in subclass');
    }
    return this.getDocsWhere<T>(this.path, where(field as string, operator, value));
  }

  /**
   * Get a single document that matches a condition
   */
  async getOneWhere(field: keyof T, operator: any, value: any): Promise<T | null> {
    const docs = await this.getWhere(field, operator, value);
    return docs.length > 0 ? docs[0] : null;
  }

  // ===================================
  // WRITE OPERATIONS
  // ===================================

  /**
   * Create a new document
   */
  async create(item: T): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.setDoc(`${this.path}/${item.id}`, item);
  }

  /**
   * Create a new document with auto-generated ID
   */
  async createWithAutoId(item: Omit<T, 'id'>): Promise<T> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    
    const id = crypto.randomUUID();
    const newItem = { ...item, id } as T;
    
    await this.create(newItem);
    return newItem;
  }

  /**
   * Update an existing document
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.updateDoc<T>(`${this.path}/${id}`, data);
  }

  /**
   * Create or update a document (upsert)
   */
  async upsert(item: T): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    
    const exists = await this.existsById(item.id);
    if (exists) {
      const { id, ...updates } = item;
      await this.update(id, updates as Partial<T>);
    } else {
      await this.create(item);
    }
  }

  /**
   * Delete a document by ID
   */
  async delete(id: string): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    await this.deleteDoc(`${this.path}/${id}`);
  }

  // ===================================
  // BULK OPERATIONS
  // ===================================

  /**
   * Create multiple documents
   */
  async createMany(items: T[]): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = items.map(item => this.create(item));
    await Promise.all(promises);
  }

  /**
   * Update multiple documents
   */
  async updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = updates.map(({ id, data }) => this.update(id, data));
    await Promise.all(promises);
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(ids: string[]): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = ids.map(id => this.delete(id));
    await Promise.all(promises);
  }

  /**
   * Bulk upsert operation
   */
  async upsertMany(items: T[]): Promise<void> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');

    const promises = items.map(item => this.upsert(item));
    await Promise.all(promises);
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Get the count of documents in the collection
   */
  async getCount(): Promise<number> {
    const docs = await this.getAll();
    return docs.length;
  }

  /**
   * Get documents with pagination
   */
  async getPaginated(offset: number = 0, limit: number = 10): Promise<T[]> {
    const allDocs = await this.getAll();
    return allDocs.slice(offset, offset + limit);
  }

  /**
   * Get documents with cursor-based pagination
   */
  async getPaginatedCursor(
    lastDocId?: string, 
    limit: number = 10,
    orderBy: keyof T = 'id' as keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<T[]> {
    if (!this.path) throw new Error('[FirestoreCrudService] "path" is not set');
    
    // This would need to be implemented with proper Firestore queries
    // For now, fall back to basic pagination
    const allDocs = await this.getAll();
    
    // Sort by the specified field
    allDocs.sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return direction === 'desc' ? -comparison : comparison;
    });

    // Find starting point if lastDocId is provided
    let startIndex = 0;
    if (lastDocId) {
      const lastIndex = allDocs.findIndex(doc => doc.id === lastDocId);
      if (lastIndex !== -1) {
        startIndex = lastIndex + 1;
      }
    }

    return allDocs.slice(startIndex, startIndex + limit);
  }

  /**
   * Search documents by text (basic implementation)
   */
  async search(field: keyof T, searchTerm: string): Promise<T[]> {
    const allDocs = await this.getAll();
    const searchLower = searchTerm.toLowerCase();
    
    return allDocs.filter(doc => {
      const fieldValue = doc[field];
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchLower);
      }
      return false;
    });
  }

  /**
   * Get statistics about the collection
   */
  async getStats(): Promise<{
    count: number;
    collectionPath: string;
    lastUpdated: Date;
  }> {
    return {
      count: await this.getCount(),
      collectionPath: this.path,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear all documents in the collection (use with caution!)
   */
  async clearAll(): Promise<void> {
    const allDocs = await this.getAll();
    const ids = allDocs.map(doc => doc.id);
    await this.deleteMany(ids);
  }
}