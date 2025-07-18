import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { ScoringService } from '@shared/data-access/services/scoring.service';

@Component({
  selector: 'app-results-column',
  imports: [RouterModule],
  template: `
    <div class="results-content">
      @if (!canShowResults()) {
        <div class="waiting-state">
          <div class="waiting-icon">📊</div>
          <h3>Results Coming Soon</h3>
          <p>Complete at least 2 categories to see your prioritized task list</p>
          <div class="progress-indicator">
            <span class="progress-text">{{completedCategories}}/2 categories minimum</span>
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" [style.width.%]="(completedCategories/2) * 100"></div>
            </div>
          </div>
        </div>
      } @else {
        <div class="results-active">
          <div class="results-header">
            <h3>Priority Rankings</h3>
            <p>Based on {{completedCategories}} completed categories</p>
          </div>
          
          <div class="task-results">
            @for (taskScore of topTasks; track taskScore.taskId; let i = $index) {
              <div class="result-item" [class.top-priority]="i < 3">
                <div class="task-rank">{{i + 1}}</div>
                <div class="task-details">
                  <h4>{{getTaskContent(taskScore.taskId)}}</h4>
                  <div class="task-meta">
                    <span class="score">{{taskScore.weightedScore}}</span>
                    <span class="reasoning">{{taskScore.reasoning}}</span>
                  </div>
                </div>
              </div>
            }
            
            @if (sortedTasks().length > 5) {
              <div class="more-results">
                <span>+{{sortedTasks().length - 5}} more tasks ranked</span>
              </div>
            }
          </div>
          
          <div class="score-summary">
            <h4>Score Distribution</h4>
            <div class="score-bars">
              <div class="score-bar">
                <span class="bar-label">High Priority</span>
                <div class="bar-container">
                  <div class="bar-fill high" [style.width.%]="(scoreDistribution.high / totalScoredTasks) * 100"></div>
                </div>
                <span class="bar-count">{{scoreDistribution.high}}</span>
              </div>
              <div class="score-bar">
                <span class="bar-label">Medium Priority</span>
                <div class="bar-container">
                  <div class="bar-fill medium" [style.width.%]="(scoreDistribution.medium / totalScoredTasks) * 100"></div>
                </div>
                <span class="bar-count">{{scoreDistribution.medium}}</span>
              </div>
              <div class="score-bar">
                <span class="bar-label">Lower Priority</span>
                <div class="bar-container">
                  <div class="bar-fill low" [style.width.%]="(scoreDistribution.low / totalScoredTasks) * 100"></div>
                </div>
                <span class="bar-count">{{scoreDistribution.low}}</span>
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button [routerLink]="['/results']" class="full-results-btn">
              View Full Results
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .results-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .waiting-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      opacity: 0.7;
    }
    
    .waiting-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    .waiting-state h3 {
      color: #666;
      margin: 0 0 0.5rem 0;
    }
    
    .waiting-state p {
      color: #999;
      margin: 0 0 1rem 0;
      font-size: 0.9rem;
    }
    
    .progress-indicator {
      width: 100%;
      max-width: 200px;
    }
    
    .progress-text {
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 0.5rem;
      display: block;
    }
    
    .mini-progress-bar {
      width: 100%;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }
    
    .mini-progress-fill {
      height: 100%;
      background: #007acc;
      transition: width 0.3s ease;
    }
    
    .results-active {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
    }
    
    .results-header h3 {
      color: #28a745;
      margin: 0 0 0.25rem 0;
    }
    
    .results-header p {
      color: #666;
      margin: 0;
      font-size: 0.9rem;
    }
    
    .task-results {
      flex: 1;
      overflow-y: auto;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .result-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      border-bottom: 1px solid #f0f0f0;
      align-items: flex-start;
    }
    
    .result-item:last-child {
      border-bottom: none;
    }
    
    .result-item.top-priority {
      background: #f8fff9;
      border-left: 3px solid #28a745;
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
    
    .top-priority .task-rank {
      background: #28a745;
    }
    
    .task-details {
      flex: 1;
    }
    
    .task-details h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
      color: #333;
      line-height: 1.3;
    }
    
    .task-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .score {
      background: #007acc;
      color: white;
      padding: 0.15rem 0.4rem;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .reasoning {
      color: #666;
      font-size: 0.75rem;
      font-style: italic;
    }
    
    .more-results {
      text-align: center;
      padding: 0.5rem;
      color: #666;
      font-size: 0.85rem;
      font-style: italic;
    }
    
    .score-summary {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .score-summary h4 {
      margin: 0 0 0.75rem 0;
      color: #333;
      font-size: 0.9rem;
    }
    
    .score-bars {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .score-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    
    .bar-label {
      width: 80px;
      color: #666;
      font-size: 0.75rem;
    }
    
    .bar-container {
      flex: 1;
      height: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .bar-fill.high {
      background: #28a745;
    }
    
    .bar-fill.medium {
      background: #ffc107;
    }
    
    .bar-fill.low {
      background: #6c757d;
    }
    
    .bar-count {
      width: 20px;
      text-align: center;
      color: #666;
      font-size: 0.75rem;
    }
    
    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }
    
    .full-results-btn {
      flex: 1;
      padding: 0.75rem;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      transition: background-color 0.2s;
    }
    
    .full-results-btn:hover {
      background: #005a9e;
    }
  `]
})
export class ResultsColumnComponent {
  private sessionStore = inject(TriageSessionStore);
  private scoringService = inject(ScoringService);
  
  session = this.sessionStore.session;
  categoryProgress = this.sessionStore.categoryProgress;
  canShowResults = this.sessionStore.canShowResults;
  sortedTasks = this.sessionStore.sortedTasks;
  scores = this.sessionStore.scores;
  
  get completedCategories() {
    return this.categoryProgress().completedCount;
  }
  
  get topTasks() {
    return this.sortedTasks().slice(0, 5);
  }
  
  get scoreDistribution() {
    return this.scoringService.getScoreDistribution(this.scores());
  }
  
  get totalScoredTasks() {
    const dist = this.scoreDistribution;
    return dist.high + dist.medium + dist.low;
  }
  
  getTaskContent(taskId: string): string {
    const session = this.session();
    if (!session?.tasks) return 'Unknown task';
    
    const task = session.tasks.find(t => t.id === taskId);
    return task?.content || 'Unknown task';
  }
}