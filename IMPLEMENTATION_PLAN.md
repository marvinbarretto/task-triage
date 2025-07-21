# Task Triage App - Implementation Plan

## Problem Overview

### Core Challenge
People struggle with task prioritization when overwhelmed. They need a systematic way to get everything out of their head and understand why Task A should come before Task B.

### Key User Pain Points
- **Brain Dump Challenge**: 10-20 mixed tasks swirling in head, need quick externalization
- **Priority Confusion**: Difficulty distinguishing genuinely urgent vs just loud/visible tasks
- **Decision Fatigue**: Mental energy wasted on meta-work (deciding what to do)
- **Context Switching**: Cognitive load of switching between evaluation criteria per task

### Success Metrics
- Capture completeness: Users get all tasks out of head in one session
- Decision confidence: Users trust the ranking and work from top down
- Time efficiency: Triage process takes <5 minutes for 15 tasks
- Cognitive relief: Users report feeling less overwhelmed after triage

## UI/UX Flow

### Main Workflow
```
Brain Dump Page (textarea + submit)
    ↓
Category Overview Page (4 categories with completion status)
    ↓ [tap category]
Category Triage Page (tap-tap-tap through tasks)
    ↓ [complete category]
Category Overview Page (shows completion + partial results)
    ↓ [complete 2+ categories]
Results Page (fully sorted task list with transparent scoring)
```

### Key UX Principles
- **Pages over modals** - Clear navigation, no modal complexity
- **Category-by-category evaluation** - Stay in one evaluation mode, blast through tasks
- **3-point scale** - Reduces decision fatigue vs 5/10-point scales
- **Transparent scoring** - Users understand WHY rankings exist
- **Minimal styling initially** - Focus on semantic HTML and accessibility

## Technical Architecture

### State Management Pattern
- **Stores** with signals for reactive state management
- **Services** for data persistence and business logic  
- **Components** consume signals directly (NO direct service injection for data)
- Clear flow: `User Action → Component → Store Method → Service Call → Store Signal Update → Component Re-render`

### Configuration-First Approach
Everything must be configurable from day one:
- Categories (name, description, scale labels, weights)
- Scoring algorithms and weights
- UI text and labels
- Export formats
- Parsing rules

### Data Persistence
- localStorage/indexedDB for session storage
- Automatic persistence on state changes
- Session recovery on app load
- Services handle storage, stores manage in-memory state

### Routing Structure
```
/                           → BrainDumpPageComponent
/overview                   → CategoryOverviewPageComponent  
/triage/:categoryKey        → TriagePageComponent
/results                    → ResultsPageComponent
/settings                   → SettingsPageComponent
```

## Project Structure

### Feature-Based Organization
```
src/app/
├── features/
│   ├── brain-dump/
│   │   ├── data-access/        # Services, stores
│   │   ├── feature/           # Smart components (pages)
│   │   └── ui/                # Dumb components
│   ├── category-overview/
│   ├── triage/
│   └── results/
├── shared/
│   ├── data-access/           # Cross-feature models, services
│   ├── ui/                    # Generic components
│   └── utils/                 # Pure functions, utilities
└── core/                      # App-wide routing, layout
```

### Component Responsibilities
- **Feature (Smart)**: Route handling, state management, service orchestration
- **UI (Dumb)**: Pure presentation, Input/Output only, no service dependencies
- **Data-Access**: API calls, business logic, state management services
- **Utils**: Pure functions, no Angular dependencies where possible

## Core Models & Interfaces

### Configurable Category System
```typescript
interface EvaluationCategory {
  key: string;                    // 'time_sensitivity', 'impact', etc.
  name: string;                   // 'Time Sensitivity'
  description: string;            // Help text for users
  scaleLabels: [string, string, string];  // ["Low", "Medium", "High"]
  weight: number;                 // Scoring weight
  inverseScoring?: boolean;       // For effort (high effort = lower priority)
}

interface AppConfig {
  categories: EvaluationCategory[];
  defaultWeights: ScoringWeights;
  ui: UIConfiguration;
  export: ExportConfiguration;
  parsing: ParsingConfiguration;
}
```

### Task & Evaluation Models
```typescript
interface Task {
  id: string;
  content: string;
  createdAt: Date;
}

interface TaskEvaluation {
  [categoryKey: string]: 1 | 2 | 3;  // Dynamic based on config
}

interface TaskScore {
  taskId: string;
  evaluation: TaskEvaluation;
  weightedScore: number;
  priorityRank: number;
  reasoning: string;
}

interface TriageSession {
  id: string;
  tasks: Task[];
  evaluations: Map<string, Partial<TaskEvaluation>>;
  categoryProgress: CategoryProgress;
  currentState: MainPageState;
  canShowResults: boolean;
}
```

### Store Architecture
```typescript
@Injectable({ providedIn: 'root' })
export class TriageSessionStore {
  private sessionSignal = signal<TriageSession | null>(null);
  private configSignal = signal<AppConfig>(defaultConfig);
  
  // Public readonly signals
  readonly session = this.sessionSignal.asReadonly();
  readonly config = this.configSignal.asReadonly();
  readonly canShowResults = computed(() => 
    this.session()?.categoryProgress.completedCount >= 2
  );
  
  // Actions
  startSession(tasks: Task[]): void { /* ... */ }
  updateEvaluation(taskId: string, category: string, rating: 1|2|3): void { /* ... */ }
  completeCategory(categoryKey: string): void { /* ... */ }
}
```

## Implementation Phases

### Phase 1: Foundation & Brain Dump (Week 1)
1. **Core models and configuration system**
   - Create all TypeScript interfaces
   - Default app configuration
   - Configuration service and store

2. **Brain dump feature complete**
   - BrainDumpStore with session management
   - TaskParsingService with configurable rules
   - BrainDumpPageComponent (smart)
   - BulkTextareaComponent (dumb)
   - Basic routing setup

3. **Category overview foundation**
   - CategoryProgressStore
   - CategoryOverviewPageComponent
   - Basic category cards showing completion status

### Phase 2: Triage System (Week 2)
1. **Category triage workflow**
   - TriageStore for current task and ratings
   - TriagePageComponent with tap-tap-tap interface
   - TaskRatingComponent (reusable)
   - Navigation between tasks

2. **Scoring system**
   - ScoringService with configurable algorithms
   - Score calculation and ranking
   - Transparent reasoning generation

3. **Results page**
   - ResultsStore for calculated scores
   - ResultsPageComponent with sorted task list
   - ScoreBreakdownComponent showing reasoning

### Phase 3: Polish & Configuration (Week 3)
1. **Settings and configuration**
   - SettingsPageComponent for all configurations
   - Dynamic category management
   - Weight adjustment interface

2. **Export and persistence**
   - ExportService with multiple formats
   - Robust localStorage/indexedDB integration
   - Session recovery and management

3. **Accessibility and performance**
   - ARIA labels and keyboard navigation
   - Performance optimization
   - Error handling and edge cases

## Key Architectural Decisions

### Why Stores with Signals?
- Reactive state management without RxJS complexity
- Clear separation between data access and presentation
- Components consume signals directly, making data flow obvious
- Easy to test and reason about

### Why Configuration-First?
- Future-proofs the system for different use cases
- Makes the app more valuable to third-party library users
- Forces us to build flexible, reusable components
- Enables A/B testing of different scoring approaches

### Why Feature-Based Structure?
- Self-contained features reduce coupling
- Clear boundaries make testing easier
- Easy to extract proven components to angular-foundation library
- Scales well as the app grows

### Why Pages Over Modals?
- Simpler routing and state management
- Better accessibility and keyboard navigation
- Clearer user mental model
- Easier to implement and test

## Success Criteria

### Technical Goals
- ✅ Complete workflow implemented with proper Angular architecture
- ✅ All features configurable through settings
- ✅ Clean separation between stores, services, and components
- ✅ Accessible HTML with semantic structure
- ✅ Fast triage process (<5 minutes for 15 tasks)

### User Experience Goals
- ✅ Users can successfully complete brain dump → triage → results workflow
- ✅ Category-by-category evaluation feels fast and natural
- ✅ Results show clear priority ranking with understandable reasoning
- ✅ Users report feeling less overwhelmed after using the tool

## Next Steps

1. Start with core models and configuration in `shared/data-access/`
2. Build brain dump feature end-to-end
3. Add basic routing and navigation
4. Implement first category triage workflow
5. Add scoring and results display
6. Iterate and polish based on testing

This plan prioritizes getting a working end-to-end experience quickly, then expanding and polishing each feature systematically.