import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  TriageSession, 
  Task, 
  TaskEvaluation, 
  TaskScore, 
  CategoryProgress, 
  MainPageState 
} from '../models';
import { ConfigStore } from './config.store';
import { ScoringService } from '../services/scoring.service';

@Injectable({
  providedIn: 'root'
})
export class TriageSessionStore {
  private configStore = inject(ConfigStore);
  private scoringService = inject(ScoringService);
  
  private sessionSignal = signal<TriageSession | null>(null);
  
  // Public readonly signals
  readonly session = this.sessionSignal.asReadonly();
  readonly tasks = computed(() => this.session()?.tasks || []);
  readonly evaluations = computed(() => this.session()?.evaluations || new Map());
  readonly categoryProgress = computed(() => this.session()?.categoryProgress || {
    categories: {},
    completedCount: 0
  });
  readonly currentState = computed(() => this.session()?.currentState || MainPageState.BRAIN_DUMP);
  
  // Scoring computations
  readonly scores = computed(() => {
    const session = this.session();
    if (!session || session.tasks.length === 0) return [];
    
    // Only use selected categories for scoring
    const allCategories = this.configStore.categories();
    const selectedCategories = allCategories.filter(cat => 
      session.selectedCategories.includes(cat.key)
    );
    
    return this.scoringService.calculateScores(
      session.tasks,
      session.evaluations,
      this.configStore.weights(),
      selectedCategories
    );
  });
  
  readonly canShowResults = computed(() => {
    const session = this.session();
    if (!session) return false;
    
    const progress = this.categoryProgress();
    const selectedCount = session.selectedCategories.length;
    
    // Need at least 2 categories selected and all selected categories completed
    return selectedCount >= 2 && progress.completedCount >= Math.min(selectedCount, 2);
  });
  
  readonly sortedTasks = computed(() => {
    return [...this.scores()].sort((a, b) => b.weightedScore - a.weightedScore);
  });
  
  // Category completion tracking
  readonly completedCategories = computed(() => {
    const progress = this.categoryProgress();
    return Object.entries(progress.categories)
      .filter(([_, completed]) => completed)
      .map(([key, _]) => key);
  });
  
  // Actions
  startNewSession(tasks: Task[]): void {
    const now = new Date();
    
    const initialProgress: CategoryProgress = {
      categories: {},
      completedCount: 0
    };
    
    const newSession: TriageSession = {
      id: `session_${Date.now()}`,
      tasks,
      selectedCategories: [], // Start with no categories selected
      evaluations: new Map(),
      categoryProgress: initialProgress,
      currentState: MainPageState.CATEGORY_SELECTION,
      canShowResults: false,
      createdAt: now,
      updatedAt: now
    };
    
    console.log(`[Store] New session created with ${tasks.length} tasks`);
    this.sessionSignal.set(newSession);
  }
  
  setSelectedCategories(categoryKeys: string[]): void {
    console.log(`[Store] Categories selected: [${categoryKeys.join(', ')}]`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const initialProgress: CategoryProgress = {
        categories: {},
        completedCount: 0
      };
      
      // Initialize only selected categories as incomplete
      categoryKeys.forEach(key => {
        initialProgress.categories[key] = false;
      });
      
      return {
        ...session,
        selectedCategories: categoryKeys,
        categoryProgress: initialProgress,
        currentState: MainPageState.CATEGORY_OVERVIEW,
        updatedAt: new Date()
      };
    });
  }
  
  updateTaskEvaluation(taskId: string, categoryKey: string, rating: 1 | 2 | 3): void {
    console.log(`[Store] Task evaluation updated: ${taskId} -> ${categoryKey}: ${rating}`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedEvaluations = new Map(session.evaluations);
      const currentEval = updatedEvaluations.get(taskId) || {};
      
      updatedEvaluations.set(taskId, {
        ...currentEval,
        [categoryKey]: rating
      });
      
      return {
        ...session,
        evaluations: updatedEvaluations,
        updatedAt: new Date()
      };
    });
  }
  
  completeCategory(categoryKey: string): void {
    console.log(`[Store] Category ${categoryKey} marked complete`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedProgress = {
        ...session.categoryProgress,
        categories: {
          ...session.categoryProgress.categories,
          [categoryKey]: true
        }
      };
      
      updatedProgress.completedCount = Object.values(updatedProgress.categories)
        .filter(completed => completed).length;
      
      console.log(`[Store] Progress update: ${updatedProgress.completedCount}/${session.selectedCategories.length} categories completed`);
      
      return {
        ...session,
        categoryProgress: updatedProgress,
        canShowResults: updatedProgress.completedCount >= 2,
        updatedAt: new Date()
      };
    });
  }
  
  setCurrentState(state: MainPageState): void {
    this.sessionSignal.update(session => {
      if (!session) return session;
      return {
        ...session,
        currentState: state,
        updatedAt: new Date()
      };
    });
  }
  
  clearSession(): void {
    console.log('[Store] Session cleared');
    this.sessionSignal.set(null);
  }
  
  // Helper methods
  getTaskEvaluation(taskId: string): Partial<TaskEvaluation> {
    return this.evaluations().get(taskId) || {};
  }
  
  isCategoryComplete(categoryKey: string): boolean {
    return this.categoryProgress().categories[categoryKey] || false;
  }
  
  getTasksEvaluatedForCategory(categoryKey: string): number {
    const evaluations = this.evaluations();
    let count = 0;
    
    evaluations.forEach(evaluation => {
      if (evaluation[categoryKey] !== undefined) {
        count++;
      }
    });
    
    return count;
  }
  
  getCategoryCompletionPercentage(categoryKey: string): number {
    const totalTasks = this.tasks().length;
    if (totalTasks === 0) return 0;
    
    const evaluatedTasks = this.getTasksEvaluatedForCategory(categoryKey);
    return Math.round((evaluatedTasks / totalTasks) * 100);
  }
}