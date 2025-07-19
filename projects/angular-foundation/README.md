# @fourfold/angular-foundation

Shared Angular utilities for rapid app development - SSR-safe services, Firestore helpers, and overlay components.

## Installation

```bash
npm install @fourfold/angular-foundation
```

## Services

### SsrPlatformService

SSR-safe platform detection and browser utilities.

```typescript
import { SsrPlatformService } from '@fourfold/angular-foundation';

constructor(private platform: SsrPlatformService) {
  // Safe platform detection
  if (this.platform.isBrowser) {
    console.log('Running in browser');
  }
  
  // Safe window access
  const window = this.platform.getWindow();
  
  // Browser-only operations
  this.platform.onlyOnBrowser(() => {
    // Code that only runs in browser
  });
  
  // Reactive window width
  console.log('Width:', this.platform.windowWidth());
}
```

### FirestoreService

Streamlined Firestore operations with automatic caching, offline support, and performance optimization.

**Key Features:**
- 📚 **Smart Caching**: Automatic IndexedDB cache with ~100x faster reads
- 🌐 **Offline Ready**: Queued writes sync when connection returns
- 📊 **Performance Logs**: See cache hits vs network requests
- 🔄 **Batch Operations**: Cost-efficient bulk operations

```typescript
import { FirestoreService } from '@fourfold/angular-foundation';

constructor(private firestore: FirestoreService) {}

// Reactive collection data
getUsers() {
  return this.firestore.collection$<User>('users');
}

// Single document
getUser(id: string) {
  return this.firestore.doc$<User>(`users/${id}`);
}

// Create/update
await this.firestore.setDoc('users/123', userData);

// Query with conditions
const adults = await this.firestore.getDocsWhere('users', 
  where('age', '>=', 18)
);

// Batch delete (cost-efficient)
await this.firestore.batchDelete(['users/1', 'users/2']);
```

### FirebaseMetricsService

**Optional** performance monitoring for Firebase operations. Perfect for development and optimization.

**When to use:**
- 🔍 **Development**: Monitor cache hit rates and performance
- 📈 **Optimization**: Identify slow queries and frequent calls
- 🎯 **Analysis**: Before/after performance comparisons

**When NOT to use:**
- 🚀 **Production**: Skip for lighter bundles
- 📱 **Mobile**: Reduce bundle size for mobile apps

```typescript
// Basic usage (metrics automatically tracked if service is provided)
import { FirestoreService } from '@fourfold/angular-foundation';

// With metrics (development/debugging)
import { 
  FirestoreService, 
  FirebaseMetricsService 
} from '@fourfold/angular-foundation';

// In your app config
bootstrapApplication(AppComponent, {
  providers: [
    // Add this line only when you want metrics
    FirebaseMetricsService,
    // ... other providers
  ]
});

// View metrics in console or programmatically
constructor(private metrics: FirebaseMetricsService) {
  // Get current session summary
  const summary = this.metrics.getSessionSummary();
  console.log(`Cache hit rate: ${summary.cacheHitRate}%`);
  
  // Reset for testing optimizations
  this.metrics.resetSession('Testing new queries');
}
```

## Development

```bash
# Run tests
npm run lib:test

# Build library
npm run lib:build

# Release new version
npm run lib:release

# Publish to npm
npm run lib:publish
```

## Versioning

This package follows [Semantic Versioning](https://semver.org/). Use conventional commits:

```bash
git commit -m "feat: add new service"     # Minor bump
git commit -m "fix: correct SSR issue"   # Patch bump
git commit -m "feat!: breaking change"   # Major bump
```

## Roadmap

- [x] SSR Platform Service
- [x] Firestore CRUD Service
- [x] Firebase Metrics Service
- [ ] Overlay Service
- [ ] Auth Utilities
- [ ] UI Components
- [ ] Pipes and Directives

## License

MIT