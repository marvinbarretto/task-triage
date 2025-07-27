# @fourfold/angular-foundation

A comprehensive Angular foundation library providing architectural patterns, data services, authentication utilities, and unstyled UI components for rapid application development.

## Installation

```bash
npm install @fourfold/angular-foundation
```

## Quick Start

```typescript
import { 
  SsrPlatformService,
  FirestoreService,
  BaseHttpService,
  ThemeStoreService,
  authGuard
} from '@fourfold/angular-foundation';
```

## Core Features

### 🏗️ Architectural Patterns

**BaseStore & CollectionStore**
Abstract classes for reactive state management with built-in loading, error states, and auth awareness.

```typescript
import { BaseStore, CollectionStore } from '@fourfold/angular-foundation';

@Injectable({ providedIn: 'root' })
export class UsersStore extends BaseStore<User> {
  protected async fetchData(): Promise<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```

### 📡 Data Services

**BaseHttpService**
Enhanced HTTP client with retry logic, error handling, and file upload support.

```typescript
import { BaseHttpService } from '@fourfold/angular-foundation';

@Injectable({ providedIn: 'root' })
export class ApiService extends BaseHttpService {
  async getUsers(): Promise<User[]> {
    return this.get<User[]>('/api/users');
  }
  
  async uploadFile(file: File): Promise<UploadResponse> {
    return this.uploadFile<UploadResponse>('/api/upload', file);
  }
}
```

**FirestoreService**
Streamlined Firestore operations with automatic caching and offline support.

```typescript
import { FirestoreService } from '@fourfold/angular-foundation';

// Reactive collection data
users$ = this.firestore.collection$<User>('users');

// Query with conditions
const adults = await this.firestore.getDocsWhere('users', 
  where('age', '>=', 18)
);
```

**ListFilterService**
Generic filtering, sorting, and pagination for data collections.

```typescript
import { ListFilterService } from '@fourfold/angular-foundation';

const filteredUsers = this.listFilter.filterItems(users, {
  searchTerm: 'john',
  filters: { status: 'active' },
  sortConfig: { field: 'name', direction: 'asc' }
});
```

### 🔐 Authentication

**Guards & Types**
Generic authentication utilities that work with any auth system.

```typescript
import { authGuard, AuthUser, AuthService } from '@fourfold/angular-foundation';

// Route protection
const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin.component')
  }
];

// Implement your auth service
@Injectable({ providedIn: 'root' })
export class MyAuthService implements AuthService<MyUser> {
  isAuthenticated(): boolean | Observable<boolean> {
    return this.user !== null;
  }
  
  getCurrentUser(): MyUser | null {
    return this.user;
  }
}
```

### 🎨 Platform Services

**SsrPlatformService**
SSR-safe platform detection and browser utilities.

```typescript
import { SsrPlatformService } from '@fourfold/angular-foundation';

// Safe platform detection
if (this.platform.isBrowser) {
  // Browser-only code
}

// Reactive window dimensions
const width = this.platform.windowWidth();
```

**ThemeStoreService**
Enhanced theme management with system preference detection and multiple theme support.

```typescript
import { ThemeStoreService } from '@fourfold/angular-foundation';

// Current theme reactive state
const currentTheme = this.themeStore.currentTheme();
const isDark = this.themeStore.isDark();

// Toggle between light/dark
this.themeStore.toggleTheme();

// Set specific theme
this.themeStore.setTheme('dark-blue');
```

### 🧩 UI Components

**Unstyled Component Library**
Accessible, headless components using CSS custom properties for theming.

```typescript
import { 
  ButtonComponent,
  ChipComponent,
  LoadingStateComponent,
  ErrorStateComponent,
  TooltipComponent
} from '@fourfold/angular-foundation';

// Usage in templates
<ff-button variant="primary" size="lg" (clicked)="handleClick()">
  Click me
</ff-button>

<ff-chip 
  variant="success" 
  [closable]="true" 
  (closed)="handleRemove()"
>
  Success Tag
</ff-chip>
```

### ⚡ HTTP Infrastructure

**Interceptors**
Complete HTTP infrastructure with functional interceptors.

```typescript
import { 
  authInterceptor,
  loadingInterceptor,
  errorHandlingInterceptor,
  retryInterceptor
} from '@fourfold/angular-foundation';

// In your app config
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        errorHandlingInterceptor,
        retryInterceptor
      ])
    )
  ]
};
```

## Advanced Usage

### Custom Store Implementation

```typescript
import { BaseStore } from '@fourfold/angular-foundation';

@Injectable({ providedIn: 'root' })
export class ProductsStore extends BaseStore<Product> {
  constructor(
    private http: HttpClient,
    @Inject(AUTH_STORE) authStore?: AuthStore
  ) {
    super(authStore);
  }

  protected async fetchData(): Promise<Product[]> {
    return this.http.get<Product[]>('/api/products').toPromise();
  }

  // Custom methods
  async addProduct(product: Partial<Product>): Promise<void> {
    const newProduct = await this.http.post<Product>('/api/products', product).toPromise();
    this._data.update(items => [...items, newProduct]);
  }
}
```

### Theme Configuration

```typescript
import { ThemeConfig, ThemeStoreService } from '@fourfold/angular-foundation';

const themeConfig: ThemeConfig = {
  defaultTheme: 'light',
  themes: {
    light: { isDark: false, name: 'Light Theme' },
    dark: { isDark: true, name: 'Dark Theme' },
    'dark-blue': { isDark: true, name: 'Dark Blue' }
  }
};

// Configure theme service
ThemeStoreService.configure(themeConfig);
```

### Authentication Integration

```typescript
// Define your user type
interface AppUser extends AuthUser {
  roles: string[];
  permissions: string[];
}

// Implement auth service
@Injectable({ providedIn: 'root' })
export class AppAuthService implements AuthService<AppUser> {
  private userSubject = new BehaviorSubject<AppUser | null>(null);
  
  isAuthenticated(): Observable<boolean> {
    return this.userSubject.pipe(map(user => !!user));
  }
  
  getCurrentUser(): AppUser | null {
    return this.userSubject.value;
  }
  
  hasRole(role: string): boolean {
    return this.getCurrentUser()?.roles.includes(role) ?? false;
  }
}

// Configure auth tokens
providers: [
  { provide: AUTH_SERVICE, useClass: AppAuthService },
  { provide: AUTH_CONFIG, useValue: { loginRoute: '/login' } }
]
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

## API Reference

### Exports by Category

```typescript
// Architectural Patterns
export { BaseStore, CollectionStore } from './lib/patterns';

// Data Services  
export { FirestoreService, FirebaseMetricsService } from './lib/services/firestore';
export { BaseHttpService } from './lib/services/http';
export { ListFilterService } from './lib/services/list-filter';

// Authentication
export { authGuard, roleGuard, AuthUser, AuthService } from './lib/services/auth';

// Platform Services
export { SsrPlatformService } from './lib/services/ssr-platform';
export { ThemeStoreService } from './lib/services/theme-store';

// UI Components
export { 
  ButtonComponent, 
  ChipComponent, 
  LoadingStateComponent,
  ErrorStateComponent,
  TooltipComponent 
} from './lib/components';

// HTTP Infrastructure
export { 
  authInterceptor,
  loadingInterceptor, 
  errorHandlingInterceptor,
  retryInterceptor
} from './lib/services/http/interceptors';
```

## TypeScript Support

The library is built with strict TypeScript and provides comprehensive type definitions:

- Generic type parameters for stores and services
- Strict typing for auth interfaces
- Type-safe theme configurations
- Component prop types with Input/Output decorators

## SSR Compatibility

All services are designed to work seamlessly with Angular Universal:

- Platform detection utilities
- Safe window/document access
- Hydration-safe state management
- Server-side rendering optimizations

## Versioning

This package follows [Semantic Versioning](https://semver.org/). Use conventional commits:

```bash
git commit -m "feat: add new service"     # Minor bump
git commit -m "fix: correct SSR issue"   # Patch bump  
git commit -m "feat!: breaking change"   # Major bump
```

## Contributing

1. Make changes with conventional commits
2. Test thoroughly (`npm run lib:test`)
3. Follow the established patterns and conventions
4. Update documentation for new features

## License

MIT