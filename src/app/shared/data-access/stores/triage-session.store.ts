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
    
    return this.scoringService.calculateScores(
      session.tasks,
      session.evaluations,
      this.configStore.weights(),
      this.configStore.categories()
    );
  });
  
  readonly canShowResults = computed(() => {
    const progress = this.categoryProgress();
    return progress.completedCount >= 2;
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
    const categories = this.configStore.categories();
    
    const initialProgress: CategoryProgress = {
      categories: {},
      completedCount: 0
    };
    
    // Initialize all categories as incomplete
    categories.forEach(cat => {
      initialProgress.categories[cat.key] = false;
    });
    
    const newSession: TriageSession = {
      id: `session_${Date.now()}`,
      tasks,
      evaluations: new Map(),
      categoryProgress: initialProgress,
      currentState: MainPageState.CATEGORY_OVERVIEW,
      canShowResults: false,
      createdAt: now,
      updatedAt: now
    };
    
    this.sessionSignal.set(newSession);
  }
  
  updateTaskEvaluation(taskId: string, categoryKey: string, rating: 1 | 2 | 3): void {
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