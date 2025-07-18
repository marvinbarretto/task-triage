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
  
  // Get current timestamp
  const timestamp = this.platform.getTimestamp();
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
- [ ] Firestore CRUD Service  
- [ ] Overlay Service
- [ ] Auth Utilities
- [ ] UI Components
- [ ] Pipes and Directives

## License

MIT