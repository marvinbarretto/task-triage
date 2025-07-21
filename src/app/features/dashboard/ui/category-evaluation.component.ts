import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { ConfigStore } from '@shared/data-access/stores/config.store';

@Component({
  selector: 'app-category-evaluation',
  imports: [RouterModule],
  template: `
    <div class="categories-content">
      @if (!session()) {
        <div class="waiting-state">
          <div class="waiting-icon">⏳</div>
          <h3>Waiting for Categories</h3>
          <p>Select your categories in the previous column to begin evaluation</p>
        </div>
      } @else if (!hasSelectedCategories) {
        <div class="waiting-state">
          <div class="waiting-icon">🎯</div>
          <h3>Categories Not Selected</h3>
          <p>Choose your evaluation categories in the previous column first</p>
        </div>
      } @else {
        <div class="categories-list">
          @for (category of categoriesWithProgress; track category.key) {
            <div class="category-card" [class.completed]="category.completed">
              <div class="category-header">
                <h4>{{category.name}}</h4>
                @if (category.completed) {
                  <span class="completed-badge">✓ Complete</span>
                } @else {
                  <span class="progress-badge">{{category.completionPercentage}}%</span>
                }
              </div>
              
              <p class="category-description">{{category.description}}</p>
              
              @if (category.completionPercentage > 0 && !category.completed) {
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="category.completionPercentage"></div>
                </div>
              }
              
              <a 
                [routerLink]="['/triage', category.key]" 
                class="category-action-btn"
                [class.completed]="category.completed">
                {{category.completed ? 'Review' : (category.completionPercentage > 0 ? 'Continue' : 'Start')}}
              </a>
            </div>
          }
        </div>
        
        @if (completedCategories >= 2) {
          <div class="progress-message">
            <div class="success-icon">🎉</div>
            <p><strong>Great progress!</strong> You've completed {{completedCategories}} categories. Check out your results in the next column!</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .categories-content {
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
      margin: 0;
      font-size: 0.9rem;
    }
    
    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
    }
    
    .category-card {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      transition: all 0.3s ease;
    }
    
    .category-card:hover {
      border-color: #007acc;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,122,204,0.1);
    }
    
    .category-card.completed {
      border-color: #28a745;
      background: #f8fff9;
    }
    
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .category-header h4 {
      margin: 0;
      color: #333;
      font-size: 1rem;
    }
    
    .completed-badge {
      background: #28a745;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .progress-badge {
      background: #007acc;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .category-description {
      color: #666;
      font-size: 0.85rem;
      margin: 0 0 1rem 0;
      line-height: 1.4;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: #007acc;
      transition: width 0.3s ease;
    }
    
    .category-action-btn {
      display: block;
      width: 100%;
      padding: 0.75rem;
      background: #007acc;
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    
    .category-action-btn:hover {
      background: #005a9e;
    }
    
    .category-action-btn.completed {
      background: #28a745;
    }
    
    .category-action-btn.completed:hover {
      background: #218838;
    }
    
    .progress-message {
      background: #e8f5e8;
      border: 1px solid #28a745;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
      text-align: center;
    }
    
    .success-icon {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    .progress-message p {
      margin: 0;
      color: #155724;
      font-size: 0.9rem;
    }
  `]
})
export class CategoryEvaluationComponent {
  private sessionStore = inject(TriageSessionStore);
  private configStore = inject(ConfigStore);
  
  session = this.sessionStore.session;
  allCategories = this.configStore.categories;
  categoryProgress = this.sessionStore.categoryProgress;
  
  get hasSelectedCategories() {
    const session = this.session();
    return session?.selectedCategories && session.selectedCategories.length > 0;
  }
  
  get selectedCategories() {
    const session = this.session();
    const allCats = this.allCategories();
    const selectedKeys = session?.selectedCategories || [];
    
    return allCats.filter(cat => selectedKeys.includes(cat.key));
  }
  
  get completedCategories() {
    return this.categoryProgress().completedCount;
  }
  
  get categoriesWithProgress() {
    const cats = this.selectedCategories;
    const progress = this.categoryProgress();
    
    return cats.map(cat => ({
      ...cat,
      completed: progress.categories[cat.key] || false,
      completionPercentage: this.sessionStore.getCategoryCompletionPercentage(cat.key)
    }));
  }
}