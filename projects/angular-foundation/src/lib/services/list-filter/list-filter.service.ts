import { Injectable, signal, computed } from '@angular/core';

/**
 * Sort direction options
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort option configuration
 */
export interface SortOption<T = any> {
  key: string;
  label: string;
  getValue: (item: T) => any;
  direction?: SortDirection;
}

/**
 * Filter predicate function type
 */
export type FilterPredicate<T = any> = (item: T, query: string) => boolean;

/**
 * List filter pagination configuration
 */
export interface ListFilterPaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Filter and sort configuration
 */
export interface FilterConfig<T = any> {
  searchFields?: Array<(item: T) => string>;
  sortOptions?: SortOption<T>[];
  defaultSort?: { key: string; direction: SortDirection };
  caseSensitive?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
}

/**
 * Generic list filtering and sorting store for Angular applications.
 * 
 * This service provides comprehensive list management functionality with:
 * - Generic type safety for any data type
 * - Search/filter capabilities with custom predicates
 * - Multi-field sorting with direction control
 * - Pagination support with configurable page sizes
 * - Reactive state management using Angular signals
 * - Computed properties for derived state
 * - Performance optimizations for large datasets
 * 
 * Features:
 * - Type-safe filtering and sorting
 * - Multiple search field support
 * - Custom filter predicates
 * - Configurable sort options
 * - Pagination with total count tracking
 * - Case-sensitive/insensitive search
 * - Debounced search (when used with async patterns)
 * - Debug utilities for development
 * 
 * Usage:
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   role: string;
 *   createdAt: Date;
 * }
 * 
 * @Component({
 *   providers: [ListFilterService]
 * })
 * export class UserListComponent {
 *   private readonly filterService = inject(ListFilterService<User>);
 *   private readonly users = signal<User[]>([]);
 * 
 *   readonly filteredUsers = computed(() => 
 *     this.filterService.filterAndSort(this.users())
 *   );
 * 
 *   readonly paginatedUsers = computed(() =>
 *     this.filterService.paginate(this.filteredUsers())
 *   );
 * 
 *   ngOnInit() {
 *     // Configure search and sort options
 *     this.filterService.configure({
 *       searchFields: [
 *         (user) => user.name,
 *         (user) => user.email
 *       ],
 *       sortOptions: [
 *         {
 *           key: 'name',
 *           label: 'Name',
 *           getValue: (user) => user.name
 *         },
 *         {
 *           key: 'email',
 *           label: 'Email',
 *           getValue: (user) => user.email
 *         },
 *         {
 *           key: 'created',
 *           label: 'Created Date',
 *           getValue: (user) => user.createdAt
 *         }
 *       ],
 *       defaultSort: { key: 'name', direction: 'asc' }
 *     });
 *   }
 * }
 * ```
 * 
 * Template usage:
 * ```html
 * <!-- Search input -->
 * <input 
 *   [value]="filterService.searchQuery()"
 *   (input)="filterService.setSearchQuery($event.target.value)"
 *   placeholder="Search users..."
 * />
 * 
 * <!-- Sort dropdown -->
 * <select (change)="filterService.setSort($event.target.value)">
 *   @for (option of filterService.sortOptions(); track option.key) {
 *     <option [value]="option.key">{{ option.label }}</option>
 *   }
 * </select>
 * 
 * <!-- Clear filters -->
 * @if (filterService.hasActiveFilters()) {
 *   <button (click)="filterService.clearAllFilters()">Clear Filters</button>
 * }
 * 
 * <!-- Results -->
 * @for (user of paginatedUsers(); track user.id) {
 *   <div>{{ user.name }} - {{ user.email }}</div>
 * }
 * 
 * <!-- Pagination -->
 * <div>
 *   Page {{ filterService.currentPage() }} of {{ filterService.totalPages() }}
 *   ({{ filterService.totalItems() }} total)
 * </div>
 * ```
 */
@Injectable()
export class ListFilterService<T = any> {
  // ===================================
  // PRIVATE SIGNALS
  // ===================================

  private readonly _searchQuery = signal<string>('');
  private readonly _sortKey = signal<string>('');
  private readonly _sortDirection = signal<SortDirection>('asc');
  private readonly _sortOptions = signal<SortOption<T>[]>([]);
  private readonly _filterPredicate = signal<FilterPredicate<T> | null>(null);
  private readonly _currentPage = signal<number>(1);
  private readonly _pageSize = signal<number>(10);
  private readonly _totalItems = signal<number>(0);
  private readonly _caseSensitive = signal<boolean>(false);

  // ===================================
  // PUBLIC READONLY SIGNALS
  // ===================================

  readonly searchQuery = this._searchQuery.asReadonly();
  readonly sortKey = this._sortKey.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly sortOptions = this._sortOptions.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly totalItems = this._totalItems.asReadonly();
  readonly caseSensitive = this._caseSensitive.asReadonly();

  // ===================================
  // COMPUTED SIGNALS
  // ===================================

  readonly activeSortOption = computed(() => {
    const key = this.sortKey();
    return this.sortOptions().find(option => option.key === key) || null;
  });

  readonly hasActiveFilters = computed(() => {
    return this.searchQuery().trim() !== '' || this.sortKey() !== '';
  });

  readonly searchQueryProcessed = computed(() => {
    const query = this.searchQuery().trim();
    return this.caseSensitive() ? query : query.toLowerCase();
  });

  readonly totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    return Math.ceil(total / size);
  });

  readonly hasNextPage = computed(() => this.currentPage() < this.totalPages());
  readonly hasPreviousPage = computed(() => this.currentPage() > 1);

  readonly paginationInfo = computed(() => ({
    currentPage: this.currentPage(),
    pageSize: this.pageSize(),
    totalItems: this.totalItems(),
    totalPages: this.totalPages(),
    hasNextPage: this.hasNextPage(),
    hasPreviousPage: this.hasPreviousPage(),
    startItem: (this.currentPage() - 1) * this.pageSize() + 1,
    endItem: Math.min(this.currentPage() * this.pageSize(), this.totalItems())
  }));

  // ===================================
  // CONFIGURATION
  // ===================================

  /**
   * Configure the filter service with options
   */
  configure(config: FilterConfig<T>): void {
    if (config.sortOptions) {
      this._sortOptions.set(config.sortOptions);
    }

    if (config.searchFields) {
      const predicate = this.createMultiFieldSearchPredicate(config.searchFields);
      this._filterPredicate.set(predicate);
    }

    if (config.defaultSort) {
      this._sortKey.set(config.defaultSort.key);
      this._sortDirection.set(config.defaultSort.direction);
    }

    if (config.caseSensitive !== undefined) {
      this._caseSensitive.set(config.caseSensitive);
    }

    if (config.defaultPageSize) {
      this._pageSize.set(config.defaultPageSize);
    }
  }

  // ===================================
  // SEARCH METHODS
  // ===================================

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
    this.resetToFirstPage();
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this._searchQuery.set('');
    this.resetToFirstPage();
  }

  /**
   * Set custom filter predicate
   */
  setFilterPredicate(predicate: FilterPredicate<T>): void {
    this._filterPredicate.set(predicate);
    this.resetToFirstPage();
  }

  // ===================================
  // SORTING METHODS
  // ===================================

  /**
   * Set sort options
   */
  setSortOptions(options: SortOption<T>[]): void {
    this._sortOptions.set(options);
  }

  /**
   * Set active sort
   */
  setSort(key: string, direction: SortDirection = 'asc'): void {
    this._sortKey.set(key);
    this._sortDirection.set(direction);
    this.resetToFirstPage();
  }

  /**
   * Toggle sort direction for current sort key
   */
  toggleSortDirection(): void {
    const current = this.sortDirection();
    this._sortDirection.set(current === 'asc' ? 'desc' : 'asc');
    this.resetToFirstPage();
  }

  /**
   * Clear active sort
   */
  clearSort(): void {
    this._sortKey.set('');
    this.resetToFirstPage();
  }

  // ===================================
  // PAGINATION METHODS
  // ===================================

  /**
   * Set page size
   */
  setPageSize(size: number): void {
    this._pageSize.set(Math.max(1, size));
    this.resetToFirstPage();
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    const maxPage = this.totalPages();
    const validPage = Math.max(1, Math.min(page, maxPage));
    this._currentPage.set(validPage);
  }

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.hasNextPage()) {
      this._currentPage.update(page => page + 1);
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.hasPreviousPage()) {
      this._currentPage.update(page => page - 1);
    }
  }

  /**
   * Reset to first page
   */
  resetToFirstPage(): void {
    this._currentPage.set(1);
  }

  // ===================================
  // FILTER AND SORT OPERATIONS
  // ===================================

  /**
   * Apply filtering and sorting to data array
   */
  filterAndSort(items: T[]): T[] {
    let result = [...items];

    // Apply search filter
    const query = this.searchQueryProcessed();
    const predicate = this._filterPredicate();

    if (query && predicate) {
      result = result.filter(item => predicate(item, query));
    }

    // Update total count for pagination
    this._totalItems.set(result.length);

    // Apply sorting
    const activeSortOption = this.activeSortOption();
    if (activeSortOption) {
      result.sort((a, b) => {
        const valueA = activeSortOption.getValue(a);
        const valueB = activeSortOption.getValue(b);

        let comparison = 0;

        // Handle different value types
        if (valueA < valueB) comparison = -1;
        else if (valueA > valueB) comparison = 1;

        return this.sortDirection() === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }

  /**
   * Apply pagination to filtered/sorted data
   */
  paginate(items: T[]): T[] {
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;

    return items.slice(startIndex, endIndex);
  }

  /**
   * Apply both filtering/sorting and pagination in one operation
   */
  processItems(items: T[]): T[] {
    const filteredAndSorted = this.filterAndSort(items);
    return this.paginate(filteredAndSorted);
  }

  // ===================================
  // UTILITY METHODS
  // ===================================

  /**
   * Clear all filters and reset pagination
   */
  clearAllFilters(): void {
    this._searchQuery.set('');
    this._sortKey.set('');
    this.resetToFirstPage();
  }

  /**
   * Reset entire state to defaults
   */
  reset(): void {
    this._searchQuery.set('');
    this._sortKey.set('');
    this._sortDirection.set('asc');
    this._currentPage.set(1);
    this._totalItems.set(0);
  }

  /**
   * Create multi-field search predicate
   */
  private createMultiFieldSearchPredicate(
    searchFields: Array<(item: T) => string>
  ): FilterPredicate<T> {
    return (item: T, query: string): boolean => {
      const caseSensitive = this.caseSensitive();
      const searchTerm = caseSensitive ? query : query.toLowerCase();

      return searchFields.some(getField => {
        const fieldValue = getField(item);
        const processedValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        return processedValue.includes(searchTerm);
      });
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      searchQuery: this.searchQuery(),
      sortKey: this.sortKey(),
      sortDirection: this.sortDirection(),
      hasActiveFilters: this.hasActiveFilters(),
      sortOptionsCount: this.sortOptions().length,
      pagination: this.paginationInfo(),
      caseSensitive: this.caseSensitive()
    };
  }

  // ===================================
  // STATIC HELPER METHODS
  // ===================================

  /**
   * Create a simple search predicate for multiple fields
   */
  static createSearchPredicate<T>(
    searchFields: Array<(item: T) => string>,
    caseSensitive = false
  ): FilterPredicate<T> {
    return (item: T, query: string): boolean => {
      const searchTerm = caseSensitive ? query : query.toLowerCase();
      
      return searchFields.some(getField => {
        const fieldValue = getField(item);
        const processedValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        return processedValue.includes(searchTerm);
      });
    };
  }

  /**
   * Create sort option helper
   */
  static createSortOption<T>(
    key: string,
    label: string,
    getValue: (item: T) => any,
    direction: SortDirection = 'asc'
  ): SortOption<T> {
    return { key, label, getValue, direction };
  }
}