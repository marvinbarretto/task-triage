import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BudgetStore } from '@shared/data-access/stores/budget.store';
import { BudgetService, BudgetInsight } from '@shared/data-access/services/budget.service';
import { BudgetCategory, BudgetEntry, WeeklyBudgetProgress } from '@shared/data-access/models/budget.model';
import { EVENT_TAG_COLORS } from '@shared/utils/event-tags.constants';
import { EventTagsComponent } from '@shared/ui/event-tags/event-tags.component';

@Component({
  selector: 'app-budgets-page',
  imports: [CommonModule, ReactiveFormsModule, EventTagsComponent],
  template: `
    <div class="page-content">
      <div class="header">
        <div class="header-left">
          <h1>Budget Management</h1>
          <div class="budget-health" [class]="budgetHealthStatus.status">
            <span class="health-emoji">{{budgetHealthStatus.emoji}}</span>
            <span class="health-message">{{budgetHealthStatus.message}}</span>
          </div>
        </div>
        <div class="header-actions">
          <button 
            type="button"
            class="export-btn"
            (click)="exportBudgetData()">
            📊 Export Data
          </button>
          <button 
            type="button"
            class="add-expense-btn"
            (click)="toggleAddExpenseForm()">
            + Add Expense
          </button>
        </div>
      </div>

      <!-- Budget Insights -->
      @if (budgetInsights().length > 0) {
        <div class="insights-section">
          <h3>💡 Budget Insights</h3>
          <div class="insights-grid">
            @for (insight of budgetInsights(); track insight.category) {
              <div class="insight-card" [class]="insight.type">
                <span class="insight-emoji">{{insight.emoji}}</span>
                <div class="insight-content">
                  <strong>{{insight.category}}</strong>
                  <p>{{insight.message}}</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Add Expense Form -->
      @if (showAddExpenseForm()) {
        <div class="add-expense-section">
          <div class="form-card">
            <h3>Add New Expense</h3>
            <form [formGroup]="expenseForm" (ngSubmit)="onAddExpense()">
              <div class="form-row">
                <div class="form-group">
                  <label for="amount">Amount ($)</label>
                  <input 
                    id="amount"
                    type="number" 
                    step="0.01"
                    formControlName="amount"
                    placeholder="0.00">
                </div>
                <div class="form-group">
                  <label for="category">Category</label>
                  <select id="category" formControlName="category">
                    <option value="">Select category...</option>
                    @for (category of availableCategories(); track category.tagKey) {
                      <option [value]="category.tagKey">
                        {{category.emoji}} {{category.name}}
                      </option>
                    }
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="description">Description</label>
                <input 
                  id="description"
                  type="text" 
                  formControlName="description"
                  placeholder="What did you spend on?">
              </div>
              <div class="form-actions">
                <button type="button" class="cancel-btn" (click)="toggleAddExpenseForm()">Cancel</button>
                <button type="submit" class="submit-btn" [disabled]="!expenseForm.valid">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Budget Overview -->
      <div class="budget-overview">
        <div class="overview-stats">
          <div class="stat-card">
            <div class="stat-value">{{totalWeeklyBudget() | number:'1.0-0'}}</div>
            <div class="stat-label">Weekly Budget</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{totalWeeklySpent() | number:'1.0-0'}}</div>
            <div class="stat-label">Spent This Week</div>
          </div>
          <div class="stat-card" [class.negative]="remainingBudget() < 0">
            <div class="stat-value">{{remainingBudget() | number:'1.0-0'}}</div>
            <div class="stat-label">{{remainingBudget() < 0 ? 'Over Budget' : 'Remaining'}}</div>
          </div>
        </div>
      </div>

      <!-- Budget Categories -->
      <div class="categories-section">
        <h3>Budget Categories</h3>
        <div class="categories-grid">
          @for (progress of budgetProgress(); track progress.categoryTagKey) {
            <div class="category-card" [class.over-budget]="progress.isOverTime">
              <div class="category-header">
                <div class="category-info">
                  <span class="category-emoji">{{progress.config.emoji}}</span>
                  <div class="category-details">
                    <h4>{{progress.config.label}}</h4>
                    <div class="category-tags">
                      <app-event-tags [tags]="[progress.categoryTagKey]" [compact]="true"></app-event-tags>
                    </div>
                  </div>
                </div>
                <div class="category-amounts">
                  <div class="spent-amount">{{progress.spent | number:'1.0-0'}}</div>
                  <div class="budget-amount">/ {{progress.allocated | number:'1.0-0'}}</div>
                </div>
              </div>
              
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="Math.min(progress.percentUsed, 100)"
                     [style.background-color]="progress.isOverTime ? '#ef4444' : progress.config.color">
                </div>
              </div>
              
              <div class="category-status">
                @if (progress.isOverTime) {
                  <span class="over-budget-text">
                    {{(progress.spent - progress.allocated) | number:'1.0-0'}} over allocated time
                  </span>
                } @else {
                  <span class="remaining-text">
                    {{progress.remaining | number:'1.0-0'}} remaining ({{100 - progress.percentUsed | number:'1.0-0'}}% left)
                  </span>
                }
              </div>
              
              <div class="category-actions">
                <button class="edit-budget-btn" (click)="editCategoryBudget(progress.categoryTagKey)">
                  Edit Budget
                </button>
                <button class="view-expenses-btn" (click)="viewCategoryExpenses(progress.categoryTagKey)">
                  View Expenses ({{getCategoryExpenseCount(progress.categoryTagKey)}})
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Recent Expenses -->
      <div class="recent-expenses-section">
        <h3>Recent Expenses</h3>
        @if (recentEntries().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">💸</div>
            <h4>No expenses recorded yet</h4>
            <p>Start by adding your first expense to track your spending.</p>
            <button type="button" class="primary" (click)="toggleAddExpenseForm()">
              Add Your First Expense
            </button>
          </div>
        } @else {
          <div class="expenses-list">
            @for (entry of recentEntries(); track entry.id) {
              <div class="expense-item">
                <div class="expense-category">
                  <app-event-tags [tags]="[entry.categoryTagKey]" [compact]="true"></app-event-tags>
                </div>
                <div class="expense-details">
                  <div class="expense-description">{{entry.description}}</div>
                  <div class="expense-date">{{formatDate(entry.date)}}</div>
                </div>
                <div class="expense-amount">{{entry.timeSpent | number:'1.2-2'}}h</div>
                <button class="delete-expense-btn" (click)="deleteExpense(entry.id)" title="Delete expense">
                  🗑️
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-left h1 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }

    .budget-health {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .budget-health.healthy {
      background: #ecfdf5;
      color: #065f46;
    }

    .budget-health.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .budget-health.over_budget {
      background: #fef2f2;
      color: #991b1b;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .export-btn, .add-expense-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .export-btn {
      background: #6b7280;
      color: white;
    }

    .export-btn:hover {
      background: #4b5563;
    }

    .add-expense-btn {
      background: #10b981;
      color: white;
    }

    .add-expense-btn:hover {
      background: #059669;
    }

    .insights-section {
      margin-bottom: 2rem;
    }

    .insights-section h3 {
      margin: 0 0 1rem 0;
      color: #1f2937;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .insight-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .insight-card.warning {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }

    .insight-card.suggestion {
      background: #ede9fe;
      border-left-color: #8b5cf6;
    }

    .insight-card.achievement {
      background: #ecfdf5;
      border-left-color: #10b981;
    }

    .insight-emoji {
      font-size: 1.5rem;
    }

    .insight-content strong {
      display: block;
      margin-bottom: 0.25rem;
      color: #1f2937;
    }

    .insight-content p {
      margin: 0;
      color: #4b5563;
      font-size: 0.9rem;
    }

    .add-expense-section {
      margin-bottom: 2rem;
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .form-card h3 {
      margin: 0 0 1.5rem 0;
      color: #1f2937;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #10b981;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .cancel-btn, .submit-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .cancel-btn {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .cancel-btn:hover {
      background: #e5e7eb;
    }

    .submit-btn {
      background: #10b981;
      color: white;
      border: none;
    }

    .submit-btn:hover:not(:disabled) {
      background: #059669;
    }

    .submit-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .budget-overview {
      margin-bottom: 2rem;
    }

    .overview-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .stat-card.negative .stat-value {
      color: #ef4444;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
    }

    .categories-section {
      margin-bottom: 2rem;
    }

    .categories-section h3 {
      margin: 0 0 1.5rem 0;
      color: #1f2937;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .category-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }

    .category-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .category-card.over-budget {
      border: 2px solid #fecaca;
      background: #fef2f2;
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
    }

    .category-details h4 {
      margin: 0 0 0.25rem 0;
      color: #1f2937;
    }

    .category-amounts {
      text-align: right;
    }

    .spent-amount {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }

    .budget-amount {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .category-status {
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .over-budget-text {
      color: #ef4444;
      font-weight: 600;
    }

    .remaining-text {
      color: #10b981;
      font-weight: 600;
    }

    .category-actions {
      display: flex;
      gap: 0.5rem;
    }

    .edit-budget-btn, .view-expenses-btn {
      flex: 1;
      padding: 0.5rem 1rem;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .edit-budget-btn:hover, .view-expenses-btn:hover {
      background: #f3f4f6;
    }

    .recent-expenses-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .recent-expenses-section h3 {
      margin: 0 0 1.5rem 0;
      color: #1f2937;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 2px dashed #d1d5db;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h4 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    button.primary {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    button.primary:hover {
      background: #059669;
    }

    .expenses-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .expense-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .expense-item:hover {
      background: #e2e8f0;
    }

    .expense-details {
      flex: 1;
    }

    .expense-description {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .expense-date {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .expense-amount {
      font-weight: 700;
      color: #1f2937;
      font-size: 1.1rem;
    }

    .delete-expense-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .delete-expense-btn:hover {
      background: #fecaca;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: stretch;
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .categories-grid {
        grid-template-columns: 1fr;
      }

      .overview-stats {
        grid-template-columns: 1fr;
      }

      .page-content {
        padding: 1rem;
      }
    }
  `]
})
export class BudgetsPageComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private budgetStore = inject(BudgetStore);
  private budgetService = inject(BudgetService);

  // Form
  expenseForm = this.fb.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    description: ['', Validators.required]
  });

  // Component state
  showAddExpenseForm = signal(false);
  budgetInsights = signal<BudgetInsight[]>([]);

  // Store signals
  readonly totalWeeklyBudget = this.budgetStore.totalWeeklyTimeAllocation;
  readonly totalWeeklySpent = this.budgetStore.totalWeeklyTimeSpent;
  readonly remainingBudget = this.budgetStore.remainingTime;
  readonly budgetProgress = this.budgetStore.budgetProgressByCategory;
  readonly categories = this.budgetStore.categories;
  readonly entries = this.budgetStore.entries;

  // Computed values
  readonly availableCategories = this.budgetStore.categories;
  readonly recentEntries = this.budgetStore.entries;
  readonly budgetHealthStatus = this.budgetService.getTimeAllocationHealthStatus();

  // Make Math available in template
  Math = Math;

  ngOnInit(): void {
    this.budgetService.initializeBudgets();
    this.loadBudgetInsights();
  }

  async loadBudgetInsights(): Promise<void> {
    const insights = await this.budgetService.generateTimeInsights();
    this.budgetInsights.set(insights);
  }

  toggleAddExpenseForm(): void {
    this.showAddExpenseForm.update(show => !show);
    if (!this.showAddExpenseForm()) {
      this.expenseForm.reset();
    }
  }

  onAddExpense(): void {
    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.value;
      this.budgetService.addTimeEntry(
        formValue.category!,
        formValue.amount!,
        formValue.description!
      );
      
      this.expenseForm.reset();
      this.showAddExpenseForm.set(false);
      this.loadBudgetInsights(); // Refresh insights
    }
  }

  deleteExpense(entryId: string): void {
    if (confirm('Are you sure you want to delete this time entry?')) {
      this.budgetService.deleteTimeEntry(entryId);
      this.loadBudgetInsights(); // Refresh insights
    }
  }

  exportBudgetData(): void {
    const csvData = this.budgetService.exportTimeTrackingData();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  editCategoryBudget(tagKey: string): void {
    const category = this.budgetStore.getCategoryByTagKey(tagKey);
    if (category) {
      const newBudget = prompt(`Enter new weekly time allocation for ${category.name}:`, category.weeklyTimeAllocation.toString());
      if (newBudget && !isNaN(Number(newBudget))) {
        this.budgetService.updateCategoryTimeAllocation(category.id, Number(newBudget));
        this.loadBudgetInsights(); // Refresh insights
      }
    }
  }

  viewCategoryExpenses(tagKey: string): void {
    // TODO: Implement detailed category view
    console.log(`Viewing expenses for category: ${tagKey}`);
  }

  getCategoryExpenseCount(tagKey: string): number {
    return this.budgetStore.getEntriesForCategory(tagKey).length;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}