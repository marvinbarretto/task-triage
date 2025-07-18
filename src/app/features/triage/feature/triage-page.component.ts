import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-triage-page',
  imports: [RouterModule],
  template: `
    <main>
      <header>
        <h1>{{categoryName}} Evaluation</h1>
        <p>Task {{currentIndex + 1}} of {{totalTasks}}</p>
        <progress [value]="currentIndex + 1" [max]="totalTasks"></progress>
      </header>
      
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
  
  categoryKey = '';
  categoryName = '';
  currentIndex = 0;
  currentRating: number | null = null;
  
  // TODO: Get from store
  tasks = [
    { id: '1', content: 'Call dentist about appointment' },
    { id: '2', content: 'Finish quarterly report' },
    { id: '3', content: 'Review team feedback' }
  ];
  
  get totalTasks() {
    return this.tasks.length;
  }
  
  get currentTask() {
    return this.tasks[this.currentIndex];
  }
  
  get isLastTask() {
    return this.currentIndex === this.totalTasks - 1;
  }
  
  get hasRating() {
    return this.currentRating !== null;
  }

  constructor() {
    this.route.params.subscribe(params => {
      this.categoryKey = params['category'];
      this.categoryName = this.getCategoryName(this.categoryKey);
    });
  }
  
  private getCategoryName(key: string): string {
    const categoryNames: Record<string, string> = {
      'time_sensitivity': 'Time Sensitivity',
      'impact': 'Impact',
      'effort': 'Effort Required',
      'energy_level': 'Energy Level'
    };
    return categoryNames[key] || key;
  }
  
  onRating(rating: number) {
    this.currentRating = rating;
    // TODO: Save rating to store
    console.log(`Rating task ${this.currentTask.id} for ${this.categoryKey}: ${rating}`);
  }
  
  previousTask() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.loadCurrentRating();
    }
  }
  
  async nextTask() {
    if (!this.hasRating) return;
    
    if (this.isLastTask) {
      // Complete category and return to overview
      console.log(`Completing category: ${this.categoryKey}`);
      await this.router.navigate(['/overview']);
    } else {
      this.currentIndex++;
      this.loadCurrentRating();
    }
  }
  
  private loadCurrentRating() {
    // TODO: Load existing rating from store
    this.currentRating = null;
  }
}