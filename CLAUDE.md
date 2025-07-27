# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
ng serve                 # Start dev server on http://localhost:4200
ng build                 # Build main app
ng build --watch --configuration development  # Watch build
ng test                  # Test main app
```

### Library Development (@fourfold/angular-foundation)
```bash
npm run lib:build        # Build library
npm run lib:test         # Test library only
npm run lib:release      # Release new version (uses standard-version)
npm run lib:publish      # Publish to npm
```

**IMPORTANT**: When making updates to the library, always update the API reference at `projects/angular-foundation/API.md` to reflect new components, services, methods, or changed interfaces. This documentation is consumed by LLMs and must stay current.

## Architecture Overview

This is an Angular 20 workspace containing:

1. **Main Application** (`src/app/`): Task triage app for prioritizing brain dumps through rapid categorization
2. **Library** (`projects/angular-foundation/`): Shared Angular utilities published as `@fourfold/angular-foundation`

### Key Architecture Points

- **Dual Project Structure**: App development alongside library development in same workspace
- **Angular Standalone Components**: Uses new standalone component architecture (no NgModules)
- **SSR-Safe Design**: Library includes SsrPlatformService for server-side rendering compatibility
- **Signal-Based**: Uses Angular signals for reactive state management
- **Library Integration**: Main app imports and tests library components directly from source

### Library Structure
- `SsrPlatformService`: Platform detection and browser utilities with SSR safety
- Prefix: `ff` for library components
- Uses conventional commits for semantic versioning
- Published to npm as `@fourfold/angular-foundation`

### App Structure
- Standalone components with SCSS styling
- Router-based navigation
- Uses library services for platform detection
- Planned features: Brain dump input, category triage, smart scoring, sorted output

## Project Configuration

- **Angular CLI**: Uses latest Angular 20 with new build system
- **Testing**: Jasmine/Karma for both app and library
- **Styling**: SCSS with component-level styles
- **TypeScript**: Strict configuration across projects
- **Versioning**: Standard-version for automated releases