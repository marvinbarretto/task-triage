import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { ConfigStore } from '@shared/data-access/stores/config.store';
import { EvaluationCategory } from '@shared/data-access/models';

@Component({
  selector: 'app-category-selection',
  imports: [CommonModule],
  template: `
    <div class="category-selection-content">
      @if (!session()) {
        <div class="waiting-state">
          <div class="waiting-icon">⏳</div>
          <h3>Waiting for Tasks</h3>
          <p>Process your brain dump in the first column to begin category selection</p>
        </div>
      } @else {
        <div class="selection-header">
          <h3>Choose Your Categories</h3>
          <p>Select 2-8 categories that matter most for prioritizing your tasks</p>
          <div class="selection-count">
            <span [class.valid]="isSelectionValid">{{selectedCount}} selected</span>
            <span class="requirement">(2-8 required)</span>
          </div>
        </div>
        
        <div class="category-groups">
          @for (group of categoryGroups; track group.name) {
            <div class="category-group">
              <h4 class="group-title">{{group.name}}</h4>
              <div class="category-grid">
                @for (category of group.categories; track category.key) {
                  <label class="category-checkbox" [class.selected]="isSelected(category.key)">
                    <input 
                      type="checkbox"
                      [value]="category.key"
                      [checked]="isSelected(category.key)"
                      (change)="toggleCategory(category.key)"
                      [disabled]="!canSelect(category.key)">
                    <div class="checkbox-content">
                      <div class="category-name">{{category.name}}</div>
                      <div class="category-description">{{category.description}}</div>
                    </div>
                  </label>
                }
              </div>
            </div>
          }
        </div>
        
        <div class="selection-actions">
          <button 
            (click)="confirmSelection()"
            [disabled]="!isSelectionValid"
            class="confirm-btn"
            [class.enabled]="isSelectionValid">
            Continue with Selected Categories
          </button>
          <button 
            (click)="selectRecommended()"
            class="preset-btn">
            Use Quick Start (4 categories)
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .category-selection-content {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
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
      margin: 0;
      font-size: 0.9rem;
    }
    
    .selection-header {
      text-align: center;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 1rem;
    }
    
    .selection-header h3 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }
    
    .selection-header p {
      color: #666;
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
    }
    
    .selection-count {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }
    
    .selection-count span {
      color: #dc3545;
      font-weight: 600;
    }
    
    .selection-count span.valid {
      color: #28a745;
    }
    
    .requirement {
      color: #999 !important;
      font-weight: 400 !important;
    }
    
    .category-groups {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .category-group {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
    }
    
    .group-title {
      color: #007acc;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .category-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    
    .category-checkbox {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .category-checkbox:hover {
      border-color: #007acc;
      background: #f0f8ff;
    }
    
    .category-checkbox.selected {
      border-color: #007acc;
      background: #e8f4fd;
    }
    
    .category-checkbox input[type="checkbox"] {
      margin: 0;
      width: 18px;
      height: 18px;
      accent-color: #007acc;
    }
    
    .category-checkbox input[type="checkbox"]:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .category-checkbox:has(input:disabled) {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .category-checkbox:has(input:disabled):hover {
      border-color: #e0e0e0;
      background: white;
    }
    
    .checkbox-content {
      flex: 1;
      min-width: 0;
    }
    
    .category-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }
    
    .category-description {
      color: #666;
      font-size: 0.8rem;
      line-height: 1.3;
    }
    
    .selection-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 2px solid #e0e0e0;
    }
    
    .confirm-btn {
      padding: 0.75rem 1.5rem;
      background: #e0e0e0;
      color: #999;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-weight: 600;
      cursor: not-allowed;
      transition: all 0.2s ease;
    }
    
    .confirm-btn.enabled {
      background: #007acc;
      color: white;
      border-color: #007acc;
      cursor: pointer;
    }
    
    .confirm-btn.enabled:hover {
      background: #005a9e;
      border-color: #005a9e;
    }
    
    .preset-btn {
      padding: 0.5rem 1rem;
      background: white;
      color: #007acc;
      border: 2px solid #007acc;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .preset-btn:hover {
      background: #f0f8ff;
    }
    
    /* Responsive adjustments */
    @media (min-width: 768px) {
      .category-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    
    @media (min-width: 1024px) {
      .selection-actions {
        flex-direction: row;
        justify-content: space-between;
      }
      
      .confirm-btn {
        flex: 1;
      }
      
      .preset-btn {
        flex: 0 0 auto;
      }
    }
  `]
})
export class CategorySelectionComponent {
  private sessionStore = inject(TriageSessionStore);
  private configStore = inject(ConfigStore);
  
  session = this.sessionStore.session;
  allCategories = this.configStore.categories;
  selectedCategories = signal<string[]>([]);
  
  readonly MIN_CATEGORIES = 2;
  readonly MAX_CATEGORIES = 8;
  readonly RECOMMENDED_CATEGORIES = ['time_sensitivity', 'impact', 'effort', 'energy_level'];
  
  constructor() {
    console.log('[CategorySelection] Component initialized');
    console.log(`[CategorySelection] ${this.allCategories().length} categories available`);
  }
  
  get selectedCount() {
    return this.selectedCategories().length;
  }
  
  get isSelectionValid() {
    const count = this.selectedCount;
    return count >= this.MIN_CATEGORIES && count <= this.MAX_CATEGORIES;
  }
  
  get categoryGroups() {
    const categories = this.allCategories();
    
    return [
      {
        name: 'Time & Urgency',
        categories: categories.filter(c => 
          ['time_sensitivity', 'deadline_pressure'].includes(c.key)
        )
      },
      {
        name: 'Impact & Importance',
        categories: categories.filter(c => 
          ['impact', 'financial_impact', 'career_impact', 'relationship_impact'].includes(c.key)
        )
      },
      {
        name: 'Effort & Resources',
        categories: categories.filter(c => 
          ['effort', 'energy_level', 'creativity_required'].includes(c.key)
        )
      },
      {
        name: 'Personal Growth',
        categories: categories.filter(c => 
          ['personal_growth', 'learning_opportunity', 'skill_building'].includes(c.key)
        )
      },
      {
        name: 'Well-being & Life Balance',
        categories: categories.filter(c => 
          ['health_wellness', 'stress_level', 'enjoyment_factor', 'family_time', 'self_care'].includes(c.key)
        )
      },
      {
        name: 'Strategic & Long-term',
        categories: categories.filter(c => 
          ['long_term_goals', 'strategic_importance', 'maintenance_vs_growth'].includes(c.key)
        )
      },
      {
        name: 'External Dependencies',
        categories: categories.filter(c => 
          ['team_dependencies', 'customer_impact', 'risk_level', 'visibility_recognition'].includes(c.key)
        )
      },
      {
        name: 'Social & Environmental',
        categories: categories.filter(c => 
          ['social_impact', 'environmental_impact'].includes(c.key)
        )
      }
    ];
  }
  
  isSelected(categoryKey: string): boolean {
    return this.selectedCategories().includes(categoryKey);
  }
  
  canSelect(categoryKey: string): boolean {
    return this.isSelected(categoryKey) || this.selectedCount < this.MAX_CATEGORIES;
  }
  
  toggleCategory(categoryKey: string): void {
    const current = this.selectedCategories();
    const categoryName = this.allCategories().find(cat => cat.key === categoryKey)?.name || categoryKey;
    
    if (current.includes(categoryKey)) {
      this.selectedCategories.set(current.filter(key => key !== categoryKey));
      console.log(`[CategorySelection] User deselected: ${categoryName}`);
    } else if (current.length < this.MAX_CATEGORIES) {
      this.selectedCategories.set([...current, categoryKey]);
      console.log(`[CategorySelection] User selected: ${categoryName}`);
    }
    
    console.log(`[CategorySelection] Current selection: ${this.selectedCategories().length} categories`);
  }
  
  selectRecommended(): void {
    this.selectedCategories.set([...this.RECOMMENDED_CATEGORIES]);
    console.log(`[CategorySelection] Used Quick Start - selected: [${this.RECOMMENDED_CATEGORIES.join(', ')}]`);
  }
  
  confirmSelection(): void {
    if (this.isSelectionValid) {
      const selectedKeys = this.selectedCategories();
      const selectedNames = selectedKeys.map(key => 
        this.allCategories().find(cat => cat.key === key)?.name || key
      );
      
      console.log(`[CategorySelection] Selection confirmed: [${selectedNames.join(', ')}] (${selectedKeys.length} total)`);
      this.sessionStore.setSelectedCategories(selectedKeys);
    }
  }
}