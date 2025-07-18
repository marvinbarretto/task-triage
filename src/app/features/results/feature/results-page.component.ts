import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-results-page',
  imports: [RouterModule],
  template: `
    <main>
      <header>
        <h1>Prioritized Task List</h1>
        <p>Based on your evaluations across {{completedCategories}} categories</p>
      </header>
      
      <section aria-label="Task results" class="results-section">
        <div class="results-header">
          <h2>Your Tasks by Priority</h2>
          <div class="export-controls">
            <button (click)="exportResults('text')" class="export-btn">
              Export as Text
            </button>
            <button (click)="exportResults('csv')" class="export-btn">
              Export as CSV
            </button>
          </div>
        </div>
        
        <ul class="task-list">
          @for (task of sortedTasks; track task.id; let i = $index) {
            <li class="task-item">
              <div class="task-rank">{{i + 1}}</div>
              <div class="task-content">
                <h3>{{task.content}}</h3>
                <div class="task-score">
                  <span class="score-value">Score: {{task.score}}</span>
                  <span class="score-reasoning">{{task.reasoning}}</span>
                </div>
              </div>
            </li>
          }
        </ul>
      </section>
      
      <section class="actions-section">
        <button [routerLink]="['/overview']" class="action-btn secondary">
          Make Changes
        </button>
        <button (click)="startNewSession()" class="action-btn primary">
          Start New Session
        </button>
      </section>
    </main>
  `,
  styles: [`
    main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header {
      text-align: center;
      margin-bottom: 3rem;
    }
    
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    
    .export-controls {
      display: flex;
      gap: 0.5rem;
    }
    
    .export-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #007acc;
      background: white;
      color: #007acc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .export-btn:hover {
      background: #007acc;
      color: white;
    }
    
    .task-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
    }
    
    .task-item:nth-child(-n+3) {
      border-color: #28a745;
      background: #f8fff9;
    }
    
    .task-rank {
      background: #007acc;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .task-item:nth-child(-n+3) .task-rank {
      background: #28a745;
    }
    
    .task-content {
      flex: 1;
    }
    
    .task-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }
    
    .task-score {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #666;
    }
    
    .score-value {
      font-weight: bold;
      color: #007acc;
    }
    
    .actions-section {
      margin-top: 3rem;
      text-align: center;
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    
    .action-btn {
      padding: 0.75rem 2rem;
      border: 2px solid #007acc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    
    .action-btn.primary {
      background: #007acc;
      color: white;
    }
    
    .action-btn.secondary {
      background: white;
      color: #007acc;
    }
    
    .action-btn:hover {
      opacity: 0.9;
    }
  `]
})
export class ResultsPageComponent {
  completedCategories = 4; // TODO: Get from store
  
  // TODO: Get from store
  sortedTasks = [
    {
      id: '1',
      content: 'Finish quarterly report',
      score: 8.5,
      reasoning: 'High impact + urgent timing = top priority'
    },
    {
      id: '2',
      content: 'Call dentist about appointment',
      score: 7.2,
      reasoning: 'Time sensitive + quick task'
    },
    {
      id: '3',
      content: 'Review team feedback',
      score: 6.8,
      reasoning: 'Medium impact + moderate effort'
    }
  ];
  
  exportResults(format: 'text' | 'csv') {
    // TODO: Implement export functionality
    console.log(`Exporting results as ${format}`);
  }
  
  startNewSession() {
    // TODO: Clear current session and navigate to brain dump
    console.log('Starting new session');
  }
}