# Task Triage App

A task prioritization app that helps users systematically organize and prioritize their brain dumps through a rapid categorization workflow.

## Project Structure

This workspace contains both the task-triage app and the angular-foundation library development:

```
task-triage/
├── src/app/                    # Task triage application
├── projects/angular-foundation/ # @fourfold/angular-foundation library
├── dist/                       # Built outputs
└── README.md                   # This file
```

## Development

### Running the App
```bash
ng serve
# Opens on http://localhost:4200
```

### Library Development
```bash
# Test library
npm run lib:test

# Build library
npm run lib:build

# Release new library version
npm run lib:release

# Publish library to npm
npm run lib:publish
```

### Testing
```bash
# Test main app
ng test

# Test library only
npm run lib:test
```

## Task Triage App Features (Planned)

- **Brain Dump Input** - Paste 10-20 lines of tasks
- **Category Triage** - Rapid cycling through Time Sensitivity, Impact, Effort, Energy Level
- **Smart Scoring** - Transparent priority calculation with configurable weights
- **Sorted Output** - Clear prioritized task list with score breakdown

## Library (@fourfold/angular-foundation)

This project also develops a comprehensive Angular foundation library published as `@fourfold/angular-foundation`. The library provides:

### Core Features
- **🏗️ Architectural Patterns** - BaseStore, CollectionStore abstractions
- **📡 Data Services** - HTTP services, Firestore integration, list filtering
- **🔐 Authentication** - Guards, types, generic auth utilities
- **🎨 Platform Services** - SSR-safe utilities, theme management
- **🧩 UI Components** - Unstyled, accessible component library
- **⚡ HTTP Infrastructure** - Interceptors for auth, loading, error handling, retry logic

See `projects/angular-foundation/README.md` for detailed library documentation.

## Tech Stack

- **Angular 20** - Latest Angular framework
- **TypeScript** - Type-safe development
- **SCSS** - Styling
- **Jasmine/Karma** - Testing
- **Standard-Version** - Automated versioning

## Library Deployment

Step-by-step process to release and publish the `@fourfold/angular-foundation` library:

### 1. Build and Test
```bash
npm run lib:build    # Build library
npm run lib:test     # Run tests to ensure everything works
```

### 2. Commit Changes
```bash
git add .
git commit -m "feat: describe your changes"
```
Use conventional commits:
- `feat:` - New feature (minor version bump)
- `fix:` - Bug fix (patch version bump)  
- `feat!:` - Breaking change (major version bump)

### 3. Release (Bump Version)
```bash
npm run lib:release
```
This will:
- Analyze commit messages for version bump
- Update version in `package.json`
- Generate/update `CHANGELOG.md`
- Create git tag

### 4. Publish to npm
```bash
npm run lib:publish
```
This publishes the built library to npm registry.

### 5. Push to Git
```bash
git push --follow-tags
```
Push commits and tags to remote repository.

## Contributing

1. Make changes with conventional commits
2. Test thoroughly (`npm run lib:test`)
3. Use proper commit messages (`feat:`, `fix:`, etc.)
4. Follow deployment process above
5. Release follows semantic versioning