import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Include pattern for Vitest tests (excluding Jasmine)
    include: ['**/*.spec.ts'],
    exclude: ['**/*.jasmine.ts', 'node_modules/**'],
    
    // Use jsdom for DOM testing if needed
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['**/*.spec.ts', '**/*.jasmine.ts']
    },
    
    // Watch mode configuration
    watch: true,
    
    // Reporter configuration
    reporter: ['verbose', 'html'],
  },
  
  resolve: {
    alias: {
      // Support TypeScript path mapping for library imports
      '@lib': path.resolve(__dirname, './src/lib'),
    }
  },
  
  // Ensure TypeScript is handled correctly
  esbuild: {
    target: 'es2022'
  }
});