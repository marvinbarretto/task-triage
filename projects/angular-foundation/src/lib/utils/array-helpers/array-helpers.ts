/**
 * Generic array utility functions for Angular applications.
 * 
 * This module provides common array manipulation utilities that are frequently
 * needed across different projects and components.
 * 
 * Features:
 * - Type-safe array operations with generic support
 * - Performance-optimized implementations
 * - Functional programming style with immutable operations
 * - Comprehensive error handling and edge case management
 * - Well-documented with usage examples
 * 
 * Use cases:
 * - Data transformation and manipulation
 * - Component data preparation
 * - Template helper functions
 * - Functional programming patterns
 * - Array processing pipelines
 * 
 * Example usage:
 * ```typescript
 * import { range, pluck, chunk, unique, groupBy } from 'angular-foundation';
 * 
 * // Generate number ranges
 * const numbers = range(1, 5);        // [1, 2, 3, 4]
 * const pagination = range(1, 10);    // [1, 2, 3, 4, 5, 6, 7, 8, 9]
 * 
 * // Extract property values
 * const users = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
 * const names = pluck(users, 'name');  // ['John', 'Jane']
 * const ages = pluck(users, 'age');    // [30, 25]
 * 
 * // Chunk arrays
 * const items = [1, 2, 3, 4, 5, 6, 7, 8];
 * const chunks = chunk(items, 3);      // [[1, 2, 3], [4, 5, 6], [7, 8]]
 * 
 * // Remove duplicates
 * const numbers = [1, 2, 2, 3, 3, 3];
 * const uniqueNumbers = unique(numbers); // [1, 2, 3]
 * 
 * // Group by property
 * const products = [
 *   { category: 'electronics', name: 'phone' },
 *   { category: 'electronics', name: 'laptop' },
 *   { category: 'clothing', name: 'shirt' }
 * ];
 * const grouped = groupBy(products, 'category');
 * // { electronics: [...], clothing: [...] }
 * ```
 */

/**
 * Generate a range of numbers from start to end (exclusive)
 * 
 * @param start - Starting number (inclusive)
 * @param end - Ending number (exclusive)
 * @returns Array of numbers from start to end-1
 * 
 * @example
 * ```typescript
 * range(1, 5)    // [1, 2, 3, 4]
 * range(0, 3)    // [0, 1, 2]
 * range(5, 5)    // []
 * range(5, 3)    // [] (invalid range)
 * ```
 */
export const range = (start: number, end: number): number[] => {
  if (start >= end) {
    return [];
  }
  
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    console.warn('[ArrayHelpers] range() expects integer values');
  }
  
  return [...Array(end - start).keys()].map((i) => i + start);
};

/**
 * Extract values of a specific property from an array of objects
 * 
 * @param elements - Array of objects to extract from
 * @param field - Property name to extract
 * @returns Array of extracted values
 * 
 * @example
 * ```typescript
 * const users = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
 * pluck(users, 'name')  // ['John', 'Jane']
 * pluck(users, 'age')   // [30, 25]
 * pluck([], 'name')     // []
 * ```
 */
export const pluck = <T, K extends keyof T>(elements: T[], field: K): T[K][] => {
  if (!Array.isArray(elements)) {
    console.warn('[ArrayHelpers] pluck() expects an array as first argument');
    return [];
  }
  
  return elements.map((element) => element[field]);
};

/**
 * Split an array into chunks of specified size
 * 
 * @param array - Array to split into chunks
 * @param size - Size of each chunk
 * @returns Array of chunks
 * 
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5, 6], 2)  // [[1, 2], [3, 4], [5, 6]]
 * chunk([1, 2, 3, 4, 5], 3)     // [[1, 2, 3], [4, 5]]
 * chunk([], 2)                  // []
 * chunk([1, 2, 3], 0)          // [[1, 2, 3]] (fallback to original array)
 * ```
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] chunk() expects an array as first argument');
    return [];
  }
  
  if (size <= 0) {
    console.warn('[ArrayHelpers] chunk() size must be positive, returning original array');
    return [array];
  }
  
  if (array.length === 0) {
    return [];
  }
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remove duplicate values from an array
 * 
 * @param array - Array to remove duplicates from
 * @param keyFn - Optional function to extract comparison key
 * @returns Array with unique values
 * 
 * @example
 * ```typescript
 * unique([1, 2, 2, 3, 3, 3])           // [1, 2, 3]
 * unique(['a', 'b', 'a', 'c'])         // ['a', 'b', 'c']
 * 
 * // With custom key function
 * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }, { id: 1, name: 'John' }];
 * unique(users, user => user.id)       // [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
 * ```
 */
export const unique = <T>(array: T[], keyFn?: (item: T) => any): T[] => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] unique() expects an array');
    return [];
  }
  
  if (array.length === 0) {
    return [];
  }
  
  if (!keyFn) {
    // Simple primitive uniqueness
    return [...new Set(array)];
  }
  
  // Complex uniqueness with key function
  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * Group array elements by a specified property or key function
 * 
 * @param array - Array to group
 * @param keyOrFn - Property name or function to extract grouping key
 * @returns Object with grouped arrays
 * 
 * @example
 * ```typescript
 * const products = [
 *   { category: 'electronics', name: 'phone' },
 *   { category: 'electronics', name: 'laptop' },
 *   { category: 'clothing', name: 'shirt' }
 * ];
 * 
 * // Group by property
 * groupBy(products, 'category')
 * // { electronics: [phone, laptop], clothing: [shirt] }
 * 
 * // Group by function
 * groupBy(products, p => p.name.length)
 * // { 5: [phone, shirt], 6: [laptop] }
 * ```
 */
export const groupBy = <T, K extends keyof T>(
  array: T[], 
  keyOrFn: K | ((item: T) => string | number)
): Record<string, T[]> => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] groupBy() expects an array');
    return {};
  }
  
  return array.reduce((groups, item) => {
    const key = typeof keyOrFn === 'function' 
      ? String(keyOrFn(item))
      : String(item[keyOrFn]);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Flatten nested arrays to specified depth
 * 
 * @param array - Array to flatten
 * @param depth - Depth to flatten (default: 1)
 * @returns Flattened array
 * 
 * @example
 * ```typescript
 * flatten([[1, 2], [3, 4]])           // [1, 2, 3, 4]
 * flatten([[[1, 2]], [[3, 4]]], 2)    // [1, 2, 3, 4]
 * flatten([1, [2, [3, [4]]]], 2)      // [1, 2, 3, [4]]
 * ```
 */
export const flatten = <T>(array: any[], depth: number = 1): T[] => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] flatten() expects an array');
    return [];
  }
  
  return depth > 0 
    ? array.reduce((acc, val) => 
        acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), [])
    : array.slice();
};

/**
 * Partition array into two arrays based on predicate
 * 
 * @param array - Array to partition
 * @param predicate - Function to test each element
 * @returns Tuple of [truthy elements, falsy elements]
 * 
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5, 6];
 * const [evens, odds] = partition(numbers, n => n % 2 === 0);
 * // evens: [2, 4, 6], odds: [1, 3, 5]
 * 
 * const users = [{ active: true, name: 'John' }, { active: false, name: 'Jane' }];
 * const [active, inactive] = partition(users, u => u.active);
 * ```
 */
export const partition = <T>(
  array: T[], 
  predicate: (item: T, index: number) => boolean
): [T[], T[]] => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] partition() expects an array');
    return [[], []];
  }
  
  const truthy: T[] = [];
  const falsy: T[] = [];
  
  array.forEach((item, index) => {
    if (predicate(item, index)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  });
  
  return [truthy, falsy];
};

/**
 * Shuffle array elements randomly (Fisher-Yates algorithm)
 * 
 * @param array - Array to shuffle
 * @returns New shuffled array
 * 
 * @example
 * ```typescript
 * shuffle([1, 2, 3, 4, 5])  // [3, 1, 5, 2, 4] (random order)
 * shuffle(['a', 'b', 'c'])  // ['c', 'a', 'b'] (random order)
 * ```
 */
export const shuffle = <T>(array: T[]): T[] => {
  if (!Array.isArray(array)) {
    console.warn('[ArrayHelpers] shuffle() expects an array');
    return [];
  }
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};