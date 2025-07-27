import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  range, 
  unique, 
  chunk, 
  pluck, 
  groupBy, 
  flatten, 
  partition, 
  shuffle 
} from './array-helpers';

describe('Array Helpers', () => {
  // Mock console.warn to test error handling
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('range()', () => {
    it('should generate number range from start to end (exclusive)', () => {
      expect(range(1, 5)).toEqual([1, 2, 3, 4]);
    });

    it('should generate range starting from 0', () => {
      expect(range(0, 3)).toEqual([0, 1, 2]);
    });

    it('should return empty array for invalid range', () => {
      expect(range(5, 3)).toEqual([]);
      expect(range(5, 5)).toEqual([]);
    });

    it('should warn for non-integer values', () => {
      range(1.5, 4.5);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] range() expects integer values');
    });
  });

  describe('unique()', () => {
    it('should remove duplicate primitives', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should handle empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should work with custom key function', () => {
      const users = [
        { id: 1, name: 'John' }, 
        { id: 2, name: 'Jane' }, 
        { id: 1, name: 'John' }
      ];
      const result = unique(users, user => user.id);
      expect(result).toEqual([
        { id: 1, name: 'John' }, 
        { id: 2, name: 'Jane' }
      ]);
    });

    it('should warn for invalid input', () => {
      unique('not-an-array' as any);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] unique() expects an array');
    });
  });

  describe('chunk()', () => {
    it('should split array into chunks of specified size', () => {
      expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
      expect(chunk([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('should handle invalid chunk size', () => {
      expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] chunk() size must be positive, returning original array');
    });

    it('should warn for invalid input', () => {
      chunk('not-an-array' as any, 2);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] chunk() expects an array as first argument');
    });
  });

  describe('pluck()', () => {
    it('should extract property values from objects', () => {
      const users = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
      expect(pluck(users, 'name')).toEqual(['John', 'Jane']);
      expect(pluck(users, 'age')).toEqual([30, 25]);
    });

    it('should handle empty array', () => {
      expect(pluck([], 'name')).toEqual([]);
    });

    it('should warn for invalid input', () => {
      pluck('not-an-array' as any, 'name');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] pluck() expects an array as first argument');
    });
  });

  describe('groupBy()', () => {
    it('should group by property name', () => {
      const products = [
        { category: 'electronics', name: 'phone' },
        { category: 'electronics', name: 'laptop' },
        { category: 'clothing', name: 'shirt' }
      ];
      
      const result = groupBy(products, 'category');
      expect(result.electronics).toHaveLength(2);
      expect(result.clothing).toHaveLength(1);
    });

    it('should group by function', () => {
      const products = [
        { name: 'phone' },
        { name: 'shirt' },
        { name: 'laptop' }
      ];
      
      const result = groupBy(products, p => p.name.length);
      expect(result['5']).toEqual([{ name: 'phone' }, { name: 'shirt' }]);
      expect(result['6']).toEqual([{ name: 'laptop' }]);
    });

    it('should warn for invalid input', () => {
      groupBy('not-an-array' as any, 'category');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] groupBy() expects an array');
    });
  });

  describe('flatten()', () => {
    it('should flatten nested arrays to specified depth', () => {
      expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
      expect(flatten([[[1, 2]], [[3, 4]]], 2)).toEqual([1, 2, 3, 4]);
    });

    it('should respect depth limit', () => {
      expect(flatten([1, [2, [3, [4]]]], 2)).toEqual([1, 2, 3, [4]]);
    });

    it('should warn for invalid input', () => {
      flatten('not-an-array' as any);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] flatten() expects an array');
    });
  });

  describe('partition()', () => {
    it('should split array based on predicate', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const [evens, odds] = partition(numbers, n => n % 2 === 0);
      
      expect(evens).toEqual([2, 4, 6]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it('should handle empty array', () => {
      const [truthy, falsy] = partition([], () => true);
      expect(truthy).toEqual([]);
      expect(falsy).toEqual([]);
    });

    it('should warn for invalid input', () => {
      partition('not-an-array' as any, () => true);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] partition() expects an array');
    });
  });

  describe('shuffle()', () => {
    it('should return shuffled array with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
      expect(shuffled).not.toBe(original); // Should be new array
    });

    it('should handle empty array', () => {
      expect(shuffle([])).toEqual([]);
    });

    it('should warn for invalid input', () => {
      shuffle('not-an-array' as any);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ArrayHelpers] shuffle() expects an array');
    });
  });
});