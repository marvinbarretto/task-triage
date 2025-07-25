import { Component, inject, OnInit, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BudgetStore } from '@shared/data-access/stores/budget.store';
import { BudgetService } from '@shared/data-access/services/budget.service';
import { EventTagsComponent } from '@shared/ui/event-tags/event-tags.component';
import { formatTimeHours } from '@shared/data-access/models/budget.model';

@Component({
  selector: 'app-budget-widget',
  imports: [CommonModule, EventTagsComponent],
  template: `
    <div class="budget-widget" [class.compact]="compact">
      <div class="widget-header">
        <div class="widget-title">
          <span class="title-icon">⏰</span>
          <h3>Time Allocation</h3>
        </div>
        @if (!compact) {
          <button class="view-all-btn" (click)="navigateToTimeTracking()">
            View All
          </button>
        }
      </div>

      <div class="budget-summary" [class.compact]="compact">
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-value" [class.negative]="remainingTime() < 0">
              {{formatTime(Math.abs(remainingTime()))}}
            </div>
            <div class="stat-label">
              {{remainingTime() < 0 ? 'Over Allocated' : 'Remaining'}}
            </div>
          </div>
          
          @if (!compact) {
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value spent">
                {{formatTime(totalWeeklyTimeSpent())}}
              </div>
              <div class="stat-label">Used</div>
            </div>
            
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-value">
                {{formatTime(totalWeeklyTimeAllocation())}}
              </div>
              <div class="stat-label">Allocated</div>
            </div>
          }
        </div>

        @if (!compact) {
          <div class="overall-progress">
            <div class="progress-bar">
              <div class="progress-fill" 
                   [style.width.%]="Math.min(progressPercentage(), 100)"
                   [style.background-color]="progressColor()">
              </div>
            </div>
            <div class="progress-text">
              {{progressPercentage() | number:'1.0-0'}}% of allocated time used
            </div>
          </div>
        }
      </div>

      @if (showCategories && topCategories().length > 0) {
        <div class="categories-preview">
          <h4>Time Usage</h4>
          <div class="category-list">
            @for (category of topCategories(); track category.categoryTagKey) {
              <div class="category-item" [class.over-budget]="category.isOverTime">
                <div class="category-info">
                  <app-event-tags [tags]="[category.categoryTagKey]" [compact]="true"></app-event-tags>
                  <div class="category-amount">
                    {{formatTime(category.spent)}}
                    @if (category.isOverTime) {
                      <span class="over-indicator">⚠️</span>
                    }
                  </div>
                </div>
                @if (!compact) {
                  <div class="mini-progress">
                    <div class="mini-progress-fill" 
                         [style.width.%]="Math.min(category.percentUsed, 100)"
                         [style.background-color]="category.isOverTime ? '#ef4444' : category.config.color">
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (timeAllocationHealthStatus.status !== 'healthy') {
        <div class="health-alert" [class]="timeAllocationHealthStatus.status">
          <span class="alert-emoji">{{timeAllocationHealthStatus.emoji}}</span>
          <span class="alert-message">{{timeAllocationHealthStatus.message}}</span>
        </div>
      }

      @if (compact) {
        <div class="quick-actions">
          <button class="quick-add-btn" (click)="navigateToTimeTracking()">
            + Log Time
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .budget-widget {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .budget-widget:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .budget-widget.compact {
      padding: 1rem;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .budget-widget.compact .widget-header {
      margin-bottom: 1rem;
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .title-icon {
      font-size: 1.5rem;
    }

    .budget-widget.compact .title-icon {
      font-size: 1.25rem;
    }

    .widget-title h3 {
      margin: 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .budget-widget.compact .widget-title h3 {
      font-size: 1.1rem;
    }

    .view-all-btn {
      background: none;
      border: 1px solid #d1d5db;
      color: #6b7280;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .view-all-btn:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .budget-summary {
      margin-bottom: 1.5rem;
    }

    .budget-summary.compact {
      margin-bottom: 1rem;
    }

    .summary-stats {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .budget-widget.compact .summary-stats {
      justify-content: center;
      margin-bottom: 0.75rem;
    }

    .stat-item {
      text-align: center;
      flex: 1;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 0.25rem;
    }

    .stat-value.negative {
      color: #ef4444;
    }

    .stat-value.spent {
      color: #6b7280;
    }

    .budget-widget.compact .stat-value {
      font-size: 1.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-divider {
      width: 1px;
      height: 3rem;
      background: #e5e7eb;
      margin: 0 1rem;
    }

    .overall-progress {
      margin-top: 1rem;
    }

    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .progress-text {
      text-align: center;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .categories-preview {
      margin-bottom: 1rem;
    }

    .categories-preview h4 {
      margin: 0 0 0.75rem 0;
      color: #1f2937;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .category-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .category-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-amount {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .over-indicator {
      font-size: 0.8rem;
    }

    .mini-progress {
      height: 3px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }

    .mini-progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .health-alert {
      padding: 0.75rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .health-alert.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .health-alert.over_time {
      background: #fef2f2;
      color: #991b1b;
    }

    .alert-emoji {
      font-size: 1rem;
    }

    .quick-actions {
      text-align: center;
    }

    .quick-add-btn {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .quick-add-btn:hover {
      background: #059669;
    }

    @media (max-width: 640px) {
      .summary-stats {
        flex-direction: column;
        gap: 1rem;
      }

      .stat-divider {
        display: none;
      }

      .stat-item {
        flex: none;
      }
    }
  `]
})
export class BudgetWidgetComponent implements OnInit {
  @Input() compact = false;
  @Input() showCategories = true;
  @Input() maxCategories = 3;

  private router = inject(Router);
  private budgetStore = inject(BudgetStore);
  private budgetService = inject(BudgetService);

  // Store signals
  readonly totalWeeklyTimeAllocation = this.budgetStore.totalWeeklyTimeAllocation;
  readonly totalWeeklyTimeSpent = this.budgetStore.totalWeeklyTimeSpent;
  readonly remainingTime = this.budgetStore.remainingTime;
  readonly budgetProgress = this.budgetStore.budgetProgressByCategory;

  // Component state
  readonly timeAllocationHealthStatus = this.budgetService.getTimeAllocationHealthStatus();

  // Make Math available in template
  Math = Math;

  ngOnInit(): void {
    this.budgetService.initializeBudgets();
  }

  navigateToTimeTracking(): void {
    this.router.navigate(['/budgets']);
  }

  progressPercentage(): number {
    const total = this.totalWeeklyTimeAllocation();
    const spent = this.totalWeeklyTimeSpent();
    
    if (total === 0) return 0;
    return (spent / total) * 100;
  }

  progressColor(): string {
    const percentage = this.progressPercentage();
    
    if (percentage > 100) return '#ef4444'; // Red for over allocated time
    if (percentage > 80) return '#f59e0b';  // Yellow for warning
    return '#10b981'; // Green for healthy
  }

  topCategories() {
    return this.budgetProgress()
      .filter(category => category.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, this.maxCategories);
  }

  formatTime(hours: number): string {
    return formatTimeHours(hours);
  }
}