import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BudgetSummary } from '@shared/data-access/models/budget.model';

export interface BudgetSummaryAction {
  type: 'export' | 'add_expense' | 'manage_categories' | 'view_insights';
  data?: any;
}

@Component({
  selector: 'app-budget-summary',
  imports: [CommonModule],
  template: `
    <div class="budget-summary" [class.compact]="compact">
      <div class="summary-header">
        <div class="header-left">
          <h3>{{title}}</h3>
          <div class="date-range">
            {{formatDateRange(summary.weekStartDate, summary.weekEndDate)}}
          </div>
        </div>
        @if (showHealthIndicator) {
          <div class="health-indicator" [class]="healthStatus">
            <span class="health-icon">{{healthIcon}}</span>
            <span class="health-text">{{healthMessage}}</span>
          </div>
        }
      </div>

      <div class="summary-stats" [class.compact]="compact">
        <div class="stat-card" [class.primary]="!compact">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">{{summary.totalWeeklyTimeAllocation | number:'1.0-0'}}h</div>
            <div class="stat-label">Total Allocated</div>
          </div>
        </div>

        <div class="stat-card" [class.warning]="spentPercentage() > 80">
          <div class="stat-icon">💸</div>
          <div class="stat-content">
            <div class="stat-value">{{summary.totalWeeklyTimeSpent | number:'1.0-0'}}h</div>
            <div class="stat-label">Total Used</div>
            @if (!compact) {
              <div class="stat-detail">{{spentPercentage() | number:'1.0-0'}}% of allocation</div>
            }
          </div>
        </div>

        <div class="stat-card" [class.negative]="summary.remainingTime < 0" [class.positive]="summary.remainingTime > 0">
          <div class="stat-icon">{{summary.remainingTime < 0 ? '⚠️' : '✅'}}</div>
          <div class="stat-content">
            <div class="stat-value">{{Math.abs(summary.remainingTime) | number:'1.0-0'}}h</div>
            <div class="stat-label">{{summary.remainingTime < 0 ? 'Over Allocated' : 'Remaining'}}</div>
          </div>
        </div>
      </div>

      @if (!compact) {
        <div class="progress-overview">
          <div class="progress-header">
            <span class="progress-title">Overall Budget Progress</span>
            <span class="progress-percentage">{{spentPercentage() | number:'1.0-0'}}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" 
                   [style.width.%]="Math.min(spentPercentage(), 100)"
                   [style.background]="progressGradient()">
              </div>
              @if (spentPercentage() > 100) {
                <div class="progress-overflow" 
                     [style.width.%]="Math.min(spentPercentage() - 100, 50)">
                </div>
              }
            </div>
          </div>
        </div>
      }

      @if (summary.overTimeCategories.length > 0) {
        <div class="alert-section">
          <div class="alert-header">
            <span class="alert-icon">⚠️</span>
            <span class="alert-title">Budget Alerts</span>
          </div>
          <div class="alert-content">
            <span class="alert-message">
              {{summary.overTimeCategories.length}} 
              {{summary.overTimeCategories.length === 1 ? 'category is' : 'categories are'}} 
              over budget
            </span>
            @if (!compact) {
              <div class="alert-categories">
                @for (category of summary.overTimeCategories.slice(0, 3); track category) {
                  <span class="alert-category">{{getCategoryName(category)}}</span>
                }
                @if (summary.overTimeCategories.length > 3) {
                  <span class="alert-more">+{{summary.overTimeCategories.length - 3}} more</span>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (showActions && !compact) {
        <div class="summary-actions">
          <button class="action-btn primary" (click)="onAction('add_expense')">
            <span class="btn-icon">➕</span>
            Add Expense
          </button>
          <button class="action-btn secondary" (click)="onAction('manage_categories')">
            <span class="btn-icon">⚙️</span>
            Manage Categories
          </button>
          <button class="action-btn tertiary" (click)="onAction('export')">
            <span class="btn-icon">📊</span>
            Export Data
          </button>
          @if (showInsights) {
            <button class="action-btn quaternary" (click)="onAction('view_insights')">
              <span class="btn-icon">💡</span>
              View Insights
            </button>
          }
        </div>
      }

      @if (compact && showQuickStats) {
        <div class="quick-stats">
          <div class="quick-stat">
            <span class="quick-stat-value">{{summary.categories.length}}</span>
            <span class="quick-stat-label">Categories</span>
          </div>
          <div class="quick-stat-divider"></div>
          <div class="quick-stat">
            <span class="quick-stat-value">{{daysRemaining}}</span>
            <span class="quick-stat-label">Days Left</span>
          </div>
          <div class="quick-stat-divider"></div>
          <div class="quick-stat">
            <span class="quick-stat-value">{{averageDailySpend | number:'1.0-0'}}</span>
            <span class="quick-stat-label">Avg/Day</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .budget-summary {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #f3f4f6;
    }

    .budget-summary.compact {
      padding: 1rem;
    }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .budget-summary.compact .summary-header {
      margin-bottom: 1rem;
    }

    .header-left h3 {
      margin: 0 0 0.25rem 0;
      color: #1f2937;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .budget-summary.compact .header-left h3 {
      font-size: 1.1rem;
    }

    .date-range {
      font-size: 0.85rem;
      color: #6b7280;
      font-weight: 500;
    }

    .health-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .health-indicator.healthy {
      background: #ecfdf5;
      color: #065f46;
    }

    .health-indicator.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .health-indicator.critical {
      background: #fef2f2;
      color: #991b1b;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .budget-summary.compact .summary-stats {
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 10px;
      background: #f8fafc;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .budget-summary.compact .stat-card {
      padding: 0.75rem;
      gap: 0.5rem;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-card.primary {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
      border-color: #bbf7d0;
    }

    .stat-card.warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fefce8 100%);
      border-color: #fde047;
    }

    .stat-card.negative {
      background: linear-gradient(135deg, #fef2f2 0%, #fefefe 100%);
      border-color: #fecaca;
    }

    .stat-card.positive {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
      border-color: #bbf7d0;
    }

    .stat-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .budget-summary.compact .stat-icon {
      font-size: 1.25rem;
    }

    .stat-content {
      flex: 1;
      min-width: 0;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.2;
    }

    .budget-summary.compact .stat-value {
      font-size: 1.1rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-detail {
      font-size: 0.7rem;
      color: #9ca3af;
      margin-top: 0.125rem;
    }

    .progress-overview {
      margin-bottom: 1.5rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .progress-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 0.9rem;
    }

    .progress-percentage {
      font-weight: 700;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .progress-bar-container {
      position: relative;
    }

    .progress-bar {
      height: 12px;
      background: #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .progress-overflow {
      position: absolute;
      top: 0;
      left: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        45deg,
        #ef4444,
        #ef4444 4px,
        #dc2626 4px,
        #dc2626 8px
      );
      animation: overflow-stripe 1s linear infinite;
    }

    @keyframes overflow-stripe {
      0% { background-position: 0 0; }
      100% { background-position: 8px 0; }
    }

    .alert-section {
      background: linear-gradient(135deg, #fef2f2 0%, #fefefe 100%);
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .alert-icon {
      font-size: 1.1rem;
    }

    .alert-title {
      font-weight: 600;
      color: #991b1b;
      font-size: 0.9rem;
    }

    .alert-message {
      color: #dc2626;
      font-weight: 500;
      font-size: 0.85rem;
    }

    .alert-categories {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .alert-category {
      background: #fecaca;
      color: #991b1b;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .alert-more {
      color: #6b7280;
      font-size: 0.75rem;
      font-style: italic;
    }

    .summary-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .action-btn {
      flex: 1;
      min-width: 120px;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border: none;
    }

    .btn-icon {
      font-size: 0.9rem;
    }

    .action-btn.primary {
      background: #10b981;
      color: white;
    }

    .action-btn.primary:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .action-btn.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .action-btn.secondary:hover {
      background: #e5e7eb;
    }

    .action-btn.tertiary {
      background: #ede9fe;
      color: #6d28d9;
    }

    .action-btn.tertiary:hover {
      background: #ddd6fe;
    }

    .action-btn.quaternary {
      background: #fef3c7;
      color: #92400e;
    }

    .action-btn.quaternary:hover {
      background: #fde68a;
    }

    .quick-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .quick-stat {
      text-align: center;
      flex: 1;
    }

    .quick-stat-value {
      display: block;
      font-size: 1.1rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.125rem;
    }

    .quick-stat-label {
      font-size: 0.7rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .quick-stat-divider {
      width: 1px;
      height: 2rem;
      background: #e5e7eb;
      margin: 0 0.5rem;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .summary-stats {
        grid-template-columns: 1fr;
      }

      .summary-header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .summary-actions {
        flex-direction: column;
      }

      .action-btn {
        flex: none;
      }
    }

    @media (max-width: 640px) {
      .stat-card {
        flex-direction: column;
        text-align: center;
        gap: 0.5rem;
      }

      .quick-stats {
        flex-direction: column;
        gap: 0.75rem;
      }

      .quick-stat-divider {
        display: none;
      }
    }
  `]
})
export class BudgetSummaryComponent {
  @Input({ required: true }) summary!: BudgetSummary;
  @Input() compact = false;
  @Input() title = 'Budget Summary';
  @Input() showActions = true;
  @Input() showInsights = true;
  @Input() showHealthIndicator = true;
  @Input() showQuickStats = false;

  @Output() action = new EventEmitter<BudgetSummaryAction>();

  // Make Math available in template
  Math = Math;

  get healthStatus(): string {
    const percentage = this.spentPercentage();
    if (percentage > 100) return 'critical';
    if (percentage > 80) return 'warning';
    return 'healthy';
  }

  get healthIcon(): string {
    const status = this.healthStatus;
    switch (status) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      default: return '✅';
    }
  }

  get healthMessage(): string {
    const status = this.healthStatus;
    switch (status) {
      case 'critical': return 'Over Budget';
      case 'warning': return 'Budget Warning';
      default: return 'On Track';
    }
  }

  get daysRemaining(): number {
    const now = new Date();
    const weekEnd = new Date(this.summary.weekEndDate);
    const diffTime = weekEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get averageDailySpend(): number {
    const daysElapsed = 7 - this.daysRemaining;
    return daysElapsed > 0 ? this.summary.totalWeeklyTimeSpent / daysElapsed : 0;
  }

  spentPercentage(): number {
    if (this.summary.totalWeeklyTimeAllocation === 0) return 0;
    return (this.summary.totalWeeklyTimeSpent / this.summary.totalWeeklyTimeAllocation) * 100;
  }

  progressGradient(): string {
    const percentage = this.spentPercentage();
    if (percentage > 100) {
      return 'linear-gradient(90deg, #10b981 0%, #f59e0b 80%, #ef4444 100%)';
    } else if (percentage > 80) {
      return 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)';
    }
    return 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
  }

  formatDateRange(startDate: Date, endDate: Date): string {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = new Date(endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `${start} - ${end}`;
  }

  getCategoryName(tagKey: string): string {
    const category = this.summary.categories.find(c => c.tagKey === tagKey);
    return category?.name || tagKey;
  }

  onAction(type: BudgetSummaryAction['type']): void {
    this.action.emit({ type });
  }
}