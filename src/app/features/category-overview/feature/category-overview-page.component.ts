import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { ConfigStore } from '@shared/data-access/stores/config.store';
import { BulkInputService } from '@shared/data-access/services/bulk-input.service';

@Component({
  selector: 'app-category-overview-page',
  imports: [RouterModule],
  template: `
    <div class="page-content">
      <header class="dashboard-header">
        <div>
          <h1>Task Triage Dashboard</h1>
          <p>{{(session()?.tasks?.length || 0)}} tasks loaded. Complete at least 2 categories to see prioritized results.</p>
        </div>
        <button (click)="startNewSession()" class="new-session-btn">
          New Sample Session
        </button>
      </header>
      
      <section aria-label="Category completion status">
        <ul class="category-list">
          @for (category of categoriesWithProgress; track category.key) {
            <li class="category-card">
              <a [routerLink]="['/triage', category.key]" 
                 [attr.aria-describedby]="category.key + '-status'"
                 [class.completed]="category.completed">
                <h2>{{category.name}}</h2>
                <p>{{category.description}}</p>
                <div class="category-progress">
                  <span [id]="category.key + '-status'" class="status">
                    {{category.completed ? '✓ Completed' : category.completionPercentage + '% complete'}}
                  </span>
                  @if (!category.completed && category.completionPercentage > 0) {
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="category.completionPercentage"></div>
                    </div>
                  }
                </div>
              </a>
            </li>
          }
        </ul>
      </section>
      
      @if (canShowResults()) {
        <section aria-label="Partial results" class="results-preview">
          <h2>Current Priority Ranking</h2>
          <p>Based on {{completedCategories}} completed categories:</p>
          
          <div class="preview-tasks">
            @for (taskScore of sortedTasks().slice(0, 5); track taskScore.taskId; let i = $index) {
              <div class="preview-task">
                <span class="task-rank">{{i + 1}}</span>
                <span class="task-content">{{getTaskContent(taskScore.taskId)}}</span>
                <span class="task-score">{{taskScore.weightedScore}}</span>
              </div>
            }
            @if (sortedTasks().length > 5) {
              <div class="more-tasks">
                +{{sortedTasks().length - 5}} more tasks...
              </div>
            }
          </div>
          
          <button [routerLink]="['/results']" class="view-results-btn">
            View Detailed Results
          </button>
        </section>
      }
    </div>
  `,
  styles: [`
    .page-content {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .new-session-btn {
      padding: 0.75rem 1.5rem;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .new-session-btn:hover {
      background: #218838;
    }
    
    .category-list {
      list-style: none;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    
    .category-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: border-color 0.2s;
    }
    
    .category-card a {
      display: block;
      padding: 1.5rem;
      text-decoration: none;
      color: inherit;
    }
    
    .category-card:hover {
      border-color: #007acc;
    }
    
    .category-card.completed {
      border-color: #28a745;
      background-color: #f8fff9;
    }
    
    .category-card h2 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }
    
    .category-card p {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.9rem;
    }
    
    .status {
      font-weight: bold;
      color: #007acc;
    }
    
    .completed .status {
      color: #28a745;
    }
    
    .results-preview {
      margin-top: 3rem;
      padding: 2rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f8f9fa;
    }
    
    .placeholder {
      padding: 2rem;
      text-align: center;
      color: #666;
      background: white;
      border: 1px dashed #ccc;
      border-radius: 4px;
      margin: 1rem 0;
    }
    
    .view-results-btn {
      padding: 0.75rem 2rem;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    
    .view-results-btn:hover {
      background: #005a9e;
    }
    
    .category-progress {
      margin-top: 0.5rem;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      margin-top: 0.25rem;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #007acc;
      transition: width 0.3s ease;
    }
    
    .preview-tasks {
      margin: 1rem 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .preview-task {
      display: flex;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid #f0f0f0;
      gap: 1rem;
    }
    
    .preview-task:last-child {
      border-bottom: none;
    }
    
    .task-rank {
      background: #007acc;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .task-content {
      flex: 1;
      font-size: 0.9rem;
    }
    
    .task-score {
      font-weight: bold;
      color: #007acc;
      font-size: 0.9rem;
    }
    
    .more-tasks {
      padding: 0.5rem 0.75rem;
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
      text-align: center;
      background: #f8f9fa;
    }
  `]
})
export class CategoryOverviewPageComponent {
  private sessionStore = inject(TriageSessionStore);
  private configStore = inject(ConfigStore);
  private bulkInputService = inject(BulkInputService);
  
  // Get data from stores
  session = this.sessionStore.session;
  categories = this.configStore.categories;
  categoryProgress = this.sessionStore.categoryProgress;
  canShowResults = this.sessionStore.canShowResults;
  scores = this.sessionStore.scores;
  sortedTasks = this.sessionStore.sortedTasks;
  
  constructor() {
    // Auto-load sample data if no session exists
    if (!this.session()) {
      this.loadSampleSession();
    }
  }
  
  get completedCategories() {
    return this.categoryProgress().completedCount;
  }
  
  get categoriesWithProgress() {
    const cats = this.categories();
    const progress = this.categoryProgress();
    
    return cats.map(cat => ({
      ...cat,
      completed: progress.categories[cat.key] || false,
      completionPercentage: this.sessionStore.getCategoryCompletionPercentage(cat.key)
    }));
  }
  
  private loadSampleSession() {
    const sampleText = `• Finish quarterly sales report for management review
• Call dentist to schedule root canal appointment  
• Review and respond to team feedback on project proposal
• Plan weekend trip to Portland with family
• Fix leaky kitchen sink faucet
• Update resume with recent Angular 20 experience
• Prepare presentation for client meeting next Tuesday
• Buy groceries for dinner party this Saturday
• Research new health insurance options during open enrollment
• Schedule car maintenance and oil change
• Organize home office and file important documents
• Learn TypeScript advanced patterns for work project`;

    const brainDumpResult = this.bulkInputService.processBrainDump(sampleText);
    const tasks = this.bulkInputService.createTasksFromExtracted(brainDumpResult.extractedTasks);
    this.sessionStore.startNewSession(tasks);
    
    console.log('Loaded sample session with', tasks.length, 'tasks');
  }
  
  startNewSession() {
    this.sessionStore.clearSession();
    this.loadSampleSession();
  }
  
  getTaskContent(taskId: string): string {
    const session = this.session();
    if (!session?.tasks) return 'Unknown task';
    
    const task = session.tasks.find(t => t.id === taskId);
    return task?.content || 'Unknown task';
  }
}