// Main feature components
export { BudgetsPageComponent } from './feature/budgets-page.component';

// UI components
export { BudgetWidgetComponent } from './ui/budget-widget.component';
export { BudgetCategoryItemComponent } from './ui/budget-category-item.component';
export { BudgetSummaryComponent, type BudgetSummaryAction } from './ui/budget-summary.component';

// Re-export data access (already available through shared)
// Store and service are available via:
// - @shared/data-access/stores/budget.store
// - @shared/data-access/services/budget.service
// - @shared/data-access/models/budget.model