import { Component, inject, OnDestroy } from '@angular/core';
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
        <p class="progress-text">Task {{currentIndex + 1}} of {{totalTasks}}</p>
        <progress [value]="currentIndex + 1" [max]="totalTasks"></progress>
        <div class="progress-percentage">{{progressPercentage}}% Complete</div>
      </header>
      
      @if (currentTask) {
        <section aria-label="Current task" class="task-section" [class.slide-in]="isSlideIn">
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
      height: 16px;
      margin-top: 1.5rem;
      border-radius: 8px;
      background: #e0e0e0;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    progress::-webkit-progress-bar {
      background: #e0e0e0;
      border-radius: 8px;
    }
    
    progress::-webkit-progress-value {
      background: linear-gradient(90deg, #007acc 0%, #28a745 100%);
      border-radius: 8px;
      transition: width 0.3s ease;
    }
    
    progress::-moz-progress-bar {
      background: linear-gradient(90deg, #007acc 0%, #28a745 100%);
      border-radius: 8px;
      transition: width 0.3s ease;
    }
    
    .progress-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }
    
    .progress-percentage {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.5rem;
      font-weight: 500;
    }
    
    .task-section {
      margin-bottom: 3rem;
      transition: all 0.4s ease;
    }
    
    .task-section.slide-in {
      animation: slideIn 0.4s ease-out;
    }
    
    @keyframes slideIn {
      0% {
        transform: translateX(30px);
        opacity: 0;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .task-section h2 {
      font-size: 2rem;
      margin-bottom: 2rem;
      padding: 2rem;
      background: #f8f9fa;
      border-radius: 12px;
      border-left: 6px solid #007acc;
      line-height: 1.4;
      font-weight: 600;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
      font-size: 1.2rem;
      color: #333;
    }
    
    .rating-group {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }
    
    .rating-btn {
      width: 120px;
      height: 120px;
      border: 3px solid #e0e0e0;
      border-radius: 50%;
      background: white;
      font-size: 2.5rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    .rating-btn:hover {
      border-color: #007acc;
      background: #f0f8ff;
      transform: scale(1.05);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    
    .rating-btn.selected {
      border-color: #007acc;
      background: #007acc;
      color: white;
      transform: scale(1.1);
      box-shadow: 0 8px 16px rgba(0, 122, 204, 0.3);
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
export class TriagePageComponent implements OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionStore = inject(TriageSessionStore);
  private configStore = inject(ConfigStore);
  
  categoryKey = '';
  currentIndex = 0;
  currentRating: number | null = null;
  isSlideIn = false;
  private keyboardHandler: (event: KeyboardEvent) => void;
  private isComponentActive = true;
  
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
  
  get progressPercentage() {
    return Math.round(((this.currentIndex + 1) / this.totalTasks) * 100);
  }

  constructor() {
    console.log('[Triage] Component initialized');
    
    this.route.params.subscribe(params => {
      this.categoryKey = params['category'];
      console.log(`[Triage] Starting evaluation for category: ${this.categoryKey}`);
      this.loadCurrentRating();
    });
    
    // Create keyboard event handler
    this.keyboardHandler = this.createKeyboardHandler();
    
    // Add keyboard event listener
    this.addKeyboardListeners();
  }
  
  ngOnDestroy(): void {
    console.log(`[Triage] Component destroyed for category: ${this.categoryKey}`);
    this.isComponentActive = false;
    this.removeKeyboardListeners();
  }
  
  onRating(rating: number) {
    if (!this.isComponentActive) {
      console.log(`[Triage] Ignoring rating - component inactive`);
      return;
    }
    
    this.currentRating = rating;
    const task = this.currentTask;
    if (task) {
      this.sessionStore.updateTaskEvaluation(task.id, this.categoryKey, rating as 1 | 2 | 3);
      console.log(`[Triage] Rating task ${task.id} for ${this.categoryKey}: ${rating}`);
      console.log(`[Triage] Task ${this.currentIndex + 1} of ${this.totalTasks}: "${task.content}"`);
      
      // Auto-advance to next task after a brief delay
      setTimeout(() => {
        this.nextTask();
      }, 500);
    }
  }
  
  previousTask() {
    if (!this.isComponentActive) return;
    
    if (this.currentIndex > 0) {
      this.currentIndex--;
      console.log(`[Triage] Previous task - now at ${this.currentIndex + 1} of ${this.totalTasks}`);
      this.loadCurrentRating();
      this.triggerSlideIn();
    }
  }
  
  async nextTask() {
    if (!this.isComponentActive) return;
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
      // Complete category and return to dashboard
      this.sessionStore.completeCategory(this.categoryKey);
      console.log(`[Triage] Category ${this.categoryKey} completed - returning to dashboard`);
      
      // Mark component as inactive before navigation
      this.isComponentActive = false;
      await this.router.navigate(['/']);
    } else {
      this.currentIndex++;
      console.log(`[Triage] Next task - now at ${this.currentIndex + 1} of ${this.totalTasks}`);
      this.loadCurrentRating();
      this.triggerSlideIn();
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
  
  private createKeyboardHandler(): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
      // Only handle events if component is active
      if (!this.isComponentActive) return;
      
      // Rating keys (1, 2, 3) - auto-advance is handled in onRating()
      if (event.key >= '1' && event.key <= '3') {
        const rating = parseInt(event.key);
        console.log(`[Triage] Keyboard input: ${event.key} -> rating ${rating}`);
        this.onRating(rating);
        event.preventDefault();
      }
      
      // Navigation keys
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        console.log(`[Triage] Keyboard input: ${event.key} -> previous task`);
        this.previousTask();
        event.preventDefault();
      }
      
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'Enter') {
        if (this.hasRating) {
          console.log(`[Triage] Keyboard input: ${event.key} -> next task`);
          this.nextTask();
          event.preventDefault();
        }
      }
    };
  }
  
  private addKeyboardListeners() {
    document.addEventListener('keydown', this.keyboardHandler);
    console.log(`[Triage] Keyboard listeners added for category: ${this.categoryKey}`);
  }
  
  private removeKeyboardListeners() {
    document.removeEventListener('keydown', this.keyboardHandler);
    console.log(`[Triage] Keyboard listeners removed for category: ${this.categoryKey}`);
  }
  
  private triggerSlideIn() {
    this.isSlideIn = false;
    setTimeout(() => {
      this.isSlideIn = true;
    }, 10);
  }
}