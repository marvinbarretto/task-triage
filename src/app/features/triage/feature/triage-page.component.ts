import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { ConfigStore } from '@shared/data-access/stores/config.store';

@Component({
  selector: 'app-triage-page',
  imports: [RouterModule],
  template: `
    <main>
      <header>
        <h1>{{categoryName}} Evaluation</h1>
        <p>{{categoryDescription}}</p>
        <p>Task {{currentIndex + 1}} of {{totalTasks}}</p>
        <progress [value]="currentIndex + 1" [max]="totalTasks"></progress>
      </header>
      
      @if (currentTask) {
        <section aria-label="Current task" class="task-section">
          <h2>{{currentTask.content}}</h2>
          
          <fieldset class="rating-fieldset">
            <legend>Rate {{categoryName}} (1 = Low, 3 = High)</legend>
          <div role="radiogroup" class="rating-group">
            @for (rating of [1,2,3]; track rating) {
              <button 
                type="button"
                class="rating-btn"
                [class.selected]="currentRating === rating"
                (click)="onRating(rating)"
                [attr.aria-pressed]="currentRating === rating">
                {{rating}}
              </button>
            }
          </div>
        </fieldset>
        </section>
      } @else {
        <section class="no-tasks">
          <h2>No tasks available</h2>
          <p>Please start a new session from the brain dump page.</p>
          <button [routerLink]="['/']" class="nav-btn primary">
            Start New Session
          </button>
        </section>
      }
      
      <nav aria-label="Task navigation" class="task-nav">
        <button 
          (click)="previousTask()" 
          [disabled]="currentIndex === 0"
          class="nav-btn">
          Previous
        </button>
        <button 
          (click)="nextTask()" 
          [disabled]="!hasRating"
          class="nav-btn primary">
          {{isLastTask ? 'Complete Category' : 'Next'}}
        </button>
      </nav>
    </main>
  `,
  styles: [`
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      text-align: center;
      margin-bottom: 3rem;
    }
    
    progress {
      width: 100%;
      height: 8px;
      margin-top: 1rem;
    }
    
    .task-section {
      margin-bottom: 3rem;
    }
    
    .task-section h2 {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #007acc;
    }
    
    .rating-fieldset {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 2rem;
      margin: 0;
    }
    
    .rating-fieldset legend {
      padding: 0 1rem;
      font-weight: bold;
    }
    
    .rating-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }
    
    .rating-btn {
      width: 80px;
      height: 80px;
      border: 2px solid #e0e0e0;
      border-radius: 50%;
      background: white;
      font-size: 1.5rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .rating-btn:hover {
      border-color: #007acc;
      background: #f0f8ff;
    }
    
    .rating-btn.selected {
      border-color: #007acc;
      background: #007acc;
      color: white;
    }
    
    .task-nav {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    
    .nav-btn {
      padding: 0.75rem 2rem;
      border: 2px solid #e0e0e0;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      font-size: 1rem;
    }
    
    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .nav-btn.primary {
      background: #007acc;
      color: white;
      border-color: #007acc;
    }
    
    .nav-btn.primary:hover:not(:disabled) {
      background: #005a9e;
    }
    
    .nav-btn:hover:not(:disabled):not(.primary) {
      border-color: #007acc;
    }
  `]
})
export class TriagePageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionStore = inject(TriageSessionStore);
  private configStore = inject(ConfigStore);
  
  categoryKey = '';
  currentIndex = 0;
  currentRating: number | null = null;
  
  // Get data from stores
  tasks = this.sessionStore.tasks;
  session = this.sessionStore.session;
  categories = this.configStore.categories;
  
  get totalTasks() {
    return this.tasks().length;
  }
  
  get currentTask() {
    return this.tasks()[this.currentIndex];
  }
  
  get isLastTask() {
    return this.currentIndex === this.totalTasks - 1;
  }
  
  get hasRating() {
    return this.currentRating !== null;
  }
  
  get categoryName() {
    const category = this.categories().find(c => c.key === this.categoryKey);
    return category?.name || this.categoryKey;
  }
  
  get categoryDescription() {
    const category = this.categories().find(c => c.key === this.categoryKey);
    return category?.description || '';
  }

  constructor() {
    this.route.params.subscribe(params => {
      this.categoryKey = params['category'];
      this.loadCurrentRating();
    });
  }
  
  onRating(rating: number) {
    this.currentRating = rating;
    const task = this.currentTask;
    if (task) {
      this.sessionStore.updateTaskEvaluation(task.id, this.categoryKey, rating as 1 | 2 | 3);
      console.log(`Rating task ${task.id} for ${this.categoryKey}: ${rating}`);
    }
  }
  
  previousTask() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadCurrentRating();
    }
  }
  
  async nextTask() {
    if (!this.hasRating) return;
    
    // Save the current rating first
    if (this.currentRating && this.currentTask) {
      this.sessionStore.updateTaskEvaluation(
        this.currentTask.id, 
        this.categoryKey, 
        this.currentRating as 1 | 2 | 3
      );
    }
    
    if (this.isLastTask) {
      // Complete category and return to overview
      this.sessionStore.completeCategory(this.categoryKey);
      console.log(`Completing category: ${this.categoryKey}`);
      await this.router.navigate(['/overview']);
    } else {
      this.currentIndex++;
      this.loadCurrentRating();
    }
  }
  
  private loadCurrentRating() {
    if (this.currentTask) {
      const evaluation = this.sessionStore.getTaskEvaluation(this.currentTask.id);
      this.currentRating = evaluation[this.categoryKey] || null;
    } else {
      this.currentRating = null;
    }
  }
}