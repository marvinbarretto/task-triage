import { Injectable } from '@angular/core';

/**
 * Pagination configuration interface
 */
export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

/**
 * Paginated result with metadata
 */
export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  startIndex: number;
  endIndex: number;
  isEmpty: boolean;
}

/**
 * Page information for UI pagination controls
 */
export interface PageInfo {
  pageNumber: number;
  isActive: boolean;
  isDisabled: boolean;
  label: string;
}

/**
 * Generic pagination service for handling data pagination across Angular applications.
 * 
 * This service provides comprehensive pagination functionality with metadata generation,
 * sorting capabilities, and pagination control helpers for building paginated UIs.
 * 
 * Features:
 * - Generic type-safe pagination for any array data
 * - Comprehensive pagination metadata (total pages, has next/previous, etc.)
 * - Built-in sorting with custom comparison functions
 * - Page boundary validation and correction
 * - Pagination control generation for UI components
 * - Empty result handling and edge case management
 * - Flexible configuration with sensible defaults
 * 
 * Use cases:
 * - Data table pagination with sorting
 * - Search results pagination
 * - Content listing with page controls
 * - API response pagination handling
 * - Gallery or card-based content pagination
 * - Large dataset client-side pagination
 * 
 * Example usage:
 * ```typescript
 * const paginationService = inject(PaginationService);
 * 
 * // Basic pagination
 * const result = paginationService.paginate(users, {
 *   currentPage: 1,
 *   pageSize: 10,
 *   totalItems: users.length
 * });
 * 
 * // With sorting
 * const sortedResult = paginationService.paginate(
 *   products,
 *   { currentPage: 2, pageSize: 20, totalItems: products.length },
 *   (a, b) => a.price - b.price
 * );
 * 
 * // Generate page controls for UI
 * const pageControls = paginationService.generatePageControls(result, 5);
 * 
 * // Check if page is valid
 * const isValid = paginationService.isValidPage(3, 100, 10);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class PaginationService {

  /**
   * Paginate an array of items with comprehensive metadata
   */
  paginate<T>(
    items: T[],
    config: PaginationConfig,
    sortFn?: (a: T, b: T) => number
  ): PaginatedResult<T> {
    // Validate and correct page boundaries
    const correctedPage = this.validatePage(config.currentPage, config.totalItems, config.pageSize);
    
    // Apply sorting if provided
    let processedItems = items;
    if (sortFn) {
      processedItems = [...items].sort(sortFn);
    }

    // Calculate pagination boundaries
    const startIndex = (correctedPage - 1) * config.pageSize;
    const endIndex = Math.min(startIndex + config.pageSize, config.totalItems);
    const totalPages = this.getTotalPages(config.totalItems, config.pageSize);

    // Extract current page items
    const paginatedItems = processedItems.slice(startIndex, endIndex);

    // Build comprehensive result
    return {
      items: paginatedItems,
      currentPage: correctedPage,
      pageSize: config.pageSize,
      totalItems: config.totalItems,
      totalPages,
      hasNext: correctedPage < totalPages,
      hasPrevious: correctedPage > 1,
      startIndex: startIndex + 1, // 1-based for display
      endIndex: endIndex,
      isEmpty: paginatedItems.length === 0
    };
  }

  /**
   * Calculate the total number of pages
   */
  getTotalPages(totalItems: number, pageSize: number): number {
    if (totalItems <= 0 || pageSize <= 0) {
      return 1;
    }
    return Math.ceil(totalItems / pageSize);
  }

  /**
   * Validate and correct page number to ensure it's within valid bounds
   */
  validatePage(currentPage: number, totalItems: number, pageSize: number): number {
    const totalPages = this.getTotalPages(totalItems, pageSize);
    
    if (currentPage < 1) {
      return 1;
    }
    
    if (currentPage > totalPages) {
      return Math.max(1, totalPages);
    }
    
    return currentPage;
  }

  /**
   * Check if a page number is valid for the given dataset
   */
  isValidPage(pageNumber: number, totalItems: number, pageSize: number): boolean {
    const totalPages = this.getTotalPages(totalItems, pageSize);
    return pageNumber >= 1 && pageNumber <= totalPages;
  }

  /**
   * Generate page control information for UI pagination components
   */
  generatePageControls(result: PaginatedResult<any>, maxVisiblePages: number = 5): PageInfo[] {
    const { currentPage, totalPages } = result;
    const pages: PageInfo[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          pageNumber: i,
          isActive: i === currentPage,
          isDisabled: false,
          label: i.toString()
        });
      }
    } else {
      // Calculate range of pages to show
      const halfRange = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfRange);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Adjust start if we're near the end
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // Add first page if not in range
      if (startPage > 1) {
        pages.push({
          pageNumber: 1,
          isActive: false,
          isDisabled: false,
          label: '1'
        });

        if (startPage > 2) {
          pages.push({
            pageNumber: -1,
            isActive: false,
            isDisabled: true,
            label: '...'
          });
        }
      }

      // Add visible page range
      for (let i = startPage; i <= endPage; i++) {
        pages.push({
          pageNumber: i,
          isActive: i === currentPage,
          isDisabled: false,
          label: i.toString()
        });
      }

      // Add last page if not in range
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push({
            pageNumber: -1,
            isActive: false,
            isDisabled: true,
            label: '...'
          });
        }

        pages.push({
          pageNumber: totalPages,
          isActive: false,
          isDisabled: false,
          label: totalPages.toString()
        });
      }
    }

    return pages;
  }

  /**
   * Get pagination summary text for UI display
   */
  getPaginationSummary(result: PaginatedResult<any>): string {
    if (result.isEmpty) {
      return 'No items found';
    }

    if (result.totalItems === 1) {
      return '1 item';
    }

    const start = result.startIndex;
    const end = result.endIndex;
    const total = result.totalItems;

    return `${start}-${end} of ${total} items`;
  }

  /**
   * Calculate offset for server-side pagination APIs
   */
  calculateOffset(currentPage: number, pageSize: number): number {
    return (currentPage - 1) * pageSize;
  }

  /**
   * Create pagination config from URL query parameters
   */
  createConfigFromParams(
    params: { page?: string; size?: string; total?: string },
    defaultPageSize: number = 10
  ): PaginationConfig {
    return {
      currentPage: Math.max(1, parseInt(params.page || '1', 10)),
      pageSize: Math.max(1, parseInt(params.size || defaultPageSize.toString(), 10)),
      totalItems: Math.max(0, parseInt(params.total || '0', 10))
    };
  }

  /**
   * Split array into chunks of specified size
   */
  chunk<T>(array: T[], chunkSize: number): T[][] {
    if (chunkSize <= 0) {
      return [array];
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}