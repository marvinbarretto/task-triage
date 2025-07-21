import { Component, inject, effect } from '@angular/core';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { BrainDumpColumnComponent } from '../ui/brain-dump-column.component';
import { CategorySelectionComponent } from '../ui/category-selection.component';
import { CategoryEvaluationComponent } from '../ui/category-evaluation.component';
import { ResultsColumnComponent } from '../ui/results-column.component';

@Component({
  selector: 'app-dashboard-kanban',
  imports: [BrainDumpColumnComponent, CategorySelectionComponent, CategoryEvaluationComponent, ResultsColumnComponent],
  template: `
    <div class="kanban-dashboard">
      <div class="kanban-header">
        <h1>Task Triage Workflow</h1>
        <p>Progress through your task prioritization from left to right</p>
      </div>
      
      <div class="kanban-board">
        <div class="kanban-column brain-dump-column" [class.active]="!hasSession">
          <div class="column-header">
            <h2>1. Brain Dump</h2>
            <span class="step-indicator">Start Here</span>
          </div>
          <app-brain-dump-column></app-brain-dump-column>
        </div>
        
        <div class="kanban-column category-selection-column" [class.active]="hasSession && !hasSelectedCategories">
          <div class="column-header">
            <h2>2. Choose Categories</h2>
            <span class="step-indicator">{{selectedCategoriesCount}} Selected</span>
          </div>
          <app-category-selection></app-category-selection>
        </div>
        
        <div class="kanban-column category-evaluation-column" [class.active]="hasSelectedCategories && !hasResults">
          <div class="column-header">
            <h2>3. Evaluate Categories</h2>
            <span class="step-indicator">{{completedCategories}}/{{selectedCategoriesCount}} Complete</span>
          </div>
          <app-category-evaluation></app-category-evaluation>
        </div>
        
        <div class="kanban-column results-column" [class.active]="hasResults">
          <div class="column-header">
            <h2>4. Prioritized Results</h2>
            <span class="step-indicator">{{taskCount}} Tasks Ranked</span>
          </div>
          <app-results-column></app-results-column>
        </div>
      </div>
      
      <div class="progress-arrows">
        <div class="arrow" [class.completed]="hasSession">→</div>
        <div class="arrow" [class.completed]="hasSelectedCategories">→</div>
        <div class="arrow" [class.completed]="hasResults">→</div>
      </div>
    </div>
  `,
  styles: [`
    .kanban-dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 1rem;
    }
    
    .kanban-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .kanban-header h1 {
      color: #007acc;
      margin-bottom: 0.5rem;
    }
    
    .kanban-header p {
      color: #666;
      font-size: 1.1rem;
    }
    
    .kanban-board {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .kanban-column {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;
      min-height: 500px;
    }
    
    .kanban-column.active {
      border-color: #007acc;
      box-shadow: 0 4px 12px rgba(0,122,204,0.15);
      transform: translateY(-2px);
    }
    
    .kanban-column:not(.active) {
      opacity: 0.7;
    }
    
    .column-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .column-header h2 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }
    
    .step-indicator {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    
    .active .step-indicator {
      background: #28a745;
    }
    
    .progress-arrows {
      display: flex;
      justify-content: center;
      gap: 6rem;
      margin-top: 1rem;
    }
    
    .arrow {
      font-size: 2rem;
      color: #e0e0e0;
      transition: color 0.3s ease;
    }
    
    .arrow.completed {
      color: #28a745;
    }
    
    /* Responsive Design */
    @media (max-width: 1200px) {
      .kanban-board {
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      
      .progress-arrows {
        gap: 4rem;
      }
    }
    
    @media (max-width: 768px) {
      .kanban-board {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .kanban-column {
        min-height: auto;
      }
      
      .progress-arrows {
        flex-direction: column;
        gap: 1rem;
        align-items: center;
      }
      
      .arrow {
        transform: rotate(90deg);
      }
    }
    
    @media (max-width: 768px) {
      .kanban-dashboard {
        padding: 0 0.5rem;
      }
      
      .kanban-column {
        padding: 1rem;
      }
      
      .column-header h2 {
        font-size: 1.1rem;
      }
    }
  `]
})
export class DashboardKanbanComponent {
  private sessionStore = inject(TriageSessionStore);
  
  session = this.sessionStore.session;
  categoryProgress = this.sessionStore.categoryProgress;
  canShowResults = this.sessionStore.canShowResults;
  
  constructor() {
    console.log('[Dashboard] Component initialized');
    
    // Use effect for reactive logging
    effect(() => {
      const currentSession = this.session();
      if (currentSession) {
        console.log(`[Dashboard] Session active with ${currentSession.tasks.length} tasks`);
        if (currentSession.selectedCategories.length > 0) {
          console.log(`[Dashboard] Selected categories: [${currentSession.selectedCategories.join(', ')}]`);
        }
      }
    });
    
    effect(() => {
      const progress = this.categoryProgress();
      if (progress.completedCount > 0) {
        console.log(`[Dashboard] Category progress: ${progress.completedCount} categories completed`);
      }
    });
    
    effect(() => {
      const canShow = this.canShowResults();
      if (canShow) {
        console.log('[Dashboard] Results available - user can view prioritized tasks');
      }
    });
  }
  
  get hasSession() {
    return !!this.session()?.tasks?.length;
  }
  
  get hasSelectedCategories() {
    const session = this.session();
    return session?.selectedCategories && session.selectedCategories.length > 0;
  }
  
  get selectedCategoriesCount() {
    const session = this.session();
    return session?.selectedCategories?.length || 0;
  }
  
  get hasResults() {
    return this.canShowResults();
  }
  
  get completedCategories() {
    return this.categoryProgress().completedCount;
  }
  
  get taskCount() {
    return this.session()?.tasks?.length || 0;
  }
}