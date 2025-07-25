import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeeklyBudgetProgress, formatTimeHours } from '@shared/data-access/models/budget.model';
import { EventTagsComponent } from '@shared/ui/event-tags/event-tags.component';

@Component({
  selector: 'app-budget-category-item',
  imports: [CommonModule, EventTagsComponent],
  template: `
    <div class="category-item" [class.over-budget]="progress.isOverTime" [class.compact]="compact">
      <div class="category-header">
        <div class="category-info">
          <span class="category-emoji">{{progress.config.emoji}}</span>
          <div class="category-details">
            <h4>{{progress.config.label}}</h4>
            @if (!compact) {
              <div class="category-tags">
                <app-event-tags [tags]="[progress.categoryTagKey]" [compact]="true"></app-event-tags>
              </div>
            }
          </div>
        </div>
        <div class="category-amounts">
          <div class="spent-amount">$ {{progress.spent | number:'1.0-0'}}</div>
          <div class="budget-amount"> {{formatTime(progress.allocated)}}</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill"
               [style.width.%]="Math.min(progress.percentUsed, 100)"
               [style.background-color]="progress.isOverTime ? '#ef4444' : progress.config.color">
          </div>
        </div>

        <div class="progress-details">
          <div class="category-status">
            @if (progress.isOverTime) {
              <span class="over-budget-text">
                <span class="status-icon">⚠️</span>
                {{formatTime(Math.abs(progress.spent - progress.allocated))}} over allocated time
              </span>
            } @else {
              <span class="remaining-text">
                <span class="status-icon">✅</span>
                $ {{progress.remaining | number:'1.0-0'}} remaining
              </span>
            }
          </div>
          <div class="percentage-text">
            {{progress.percentUsed | number:'1.0-0'}}% used
          </div>
        </div>
      </div>

      @if (showActions) {
        <div class="category-actions">
          <button class="action-btn secondary" (click)="onEditBudget()">
            <span class="btn-icon">✏️</span>
            Edit Budget
          </button>
          <button class="action-btn primary" (click)="onAddExpense()">
            <span class="btn-icon">➕</span>
            Add Expense
          </button>
          @if (showViewExpenses) {
            <button class="action-btn tertiary" (click)="onViewExpenses()">
              <span class="btn-icon">📊</span>
              View Expenses ({{expenseCount}})
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .category-item {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .category-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .category-item.compact {
      padding: 1rem;
    }

    .category-item.over-budget {
      border-color: #fecaca;
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .category-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .category-emoji {
      font-size: 2rem;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }

    .category-item.compact .category-emoji {
      font-size: 1.5rem;
    }

    .category-details h4 {
      margin: 0 0 0.25rem 0;
      color: #1f2937;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .category-item.compact .category-details h4 {
      margin-bottom: 0;
    }

    .category-amounts {
      text-align: right;
    }

    .spent-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.2;
    }

    .budget-amount {
      font-size: 0.9rem;
      color: #6b7280;
      font-weight: 500;
    }

    .progress-section {
      margin-bottom: 1rem;
    }

    .category-item.compact .progress-section {
      margin-bottom: 0.75rem;
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.75rem;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.2) 0%,
        transparent 50%,
        rgba(255, 255, 255, 0.2) 100%
      );
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
    }

    .category-status {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .status-icon {
      font-size: 0.8rem;
    }

    .over-budget-text {
      color: #dc2626;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .remaining-text {
      color: #059669;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .percentage-text {
      color: #6b7280;
      font-weight: 500;
    }

    .category-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 120px;
      padding: 0.625rem 1rem;
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
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
    }

    .action-btn.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .action-btn.secondary:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
      transform: translateY(-1px);
    }

    .action-btn.tertiary {
      background: #ede9fe;
      color: #6d28d9;
      border: 1px solid #c4b5fd;
    }

    .action-btn.tertiary:hover {
      background: #ddd6fe;
      border-color: #a78bfa;
      transform: translateY(-1px);
    }

    /* Responsive design */
    @media (max-width: 640px) {
      .category-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      .category-amounts {
        text-align: left;
      }

      .category-actions {
        flex-direction: column;
      }

      .action-btn {
        flex: none;
        min-width: auto;
      }

      .progress-details {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    }

    /* Animation for over-budget warning */
    .category-item.over-budget {
      animation: pulse-warning 2s infinite;
    }

    @keyframes pulse-warning {
      0%, 100% {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      50% {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 2px rgba(239, 68, 68, 0.2);
      }
    }

    /* Hover effect for progress bar */
    .category-item:hover .progress-bar {
      transform: scaleY(1.2);
      transition: transform 0.2s ease;
    }

    .category-item:hover .progress-fill::after {
      animation: shimmer 1.5s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% {
        transform: translateX(-100%);
      }
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class BudgetCategoryItemComponent {
  @Input({ required: true }) progress!: WeeklyBudgetProgress;
  @Input() compact = false;
  @Input() showActions = true;
  @Input() showViewExpenses = true;
  @Input() expenseCount = 0;

  @Output() editBudget = new EventEmitter<string>();
  @Output() addExpense = new EventEmitter<string>();
  @Output() viewExpenses = new EventEmitter<string>();

  // Make Math available in template
  Math = Math;

  onEditBudget(): void {
    this.editBudget.emit(this.progress.categoryTagKey);
  }

  onAddExpense(): void {
    this.addExpense.emit(this.progress.categoryTagKey);
  }

  onViewExpenses(): void {
    this.viewExpenses.emit(this.progress.categoryTagKey);
  }

  formatTime(hours: number): string {
    return formatTimeHours(hours);
  }
}
