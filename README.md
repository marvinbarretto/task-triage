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

This project also develops a shared Angular utilities library published as `@fourfold/angular-foundation`. See `projects/angular-foundation/README.md` for library documentation.

## Tech Stack

- **Angular 20** - Latest Angular framework
- **TypeScript** - Type-safe development
- **SCSS** - Styling
- **Jasmine/Karma** - Testing
- **Standard-Version** - Automated versioning

## Contributing

1. Make changes with conventional commits
2. Test thoroughly (`npm run lib:test`)
3. Use proper commit messages (`feat:`, `fix:`, etc.)
4. Release follows semantic versioning