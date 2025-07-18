import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-category-overview-page',
  imports: [RouterModule],
  template: `
    <main>
      <h1>Triage Progress</h1>
      <p>Evaluate your tasks across these categories. Complete at least 2 to see prioritized results.</p>
      
      <section aria-label="Category completion status">
        <ul class="category-list">
          @for (category of categories; track category.key) {
            <li class="category-card">
              <a [routerLink]="['/triage', category.key]" 
                 [attr.aria-describedby]="category.key + '-status'"
                 [class.completed]="category.completed">
                <h2>{{category.name}}</h2>
                <p>{{category.description}}</p>
                <span [id]="category.key + '-status'" class="status">
                  {{category.completed ? '✓ Completed' : 'Not started'}}
                </span>
              </a>
            </li>
          }
        </ul>
      </section>
      
      @if (canShowResults) {
        <section aria-label="Partial results" class="results-preview">
          <h2>Current Priority Ranking</h2>
          <p>Based on {{completedCategories}} completed categories:</p>
          <!-- TODO: Add task list component -->
          <div class="placeholder">Task results will appear here...</div>
          <button [routerLink]="['/results']" class="view-results-btn">
            View Detailed Results
          </button>
        </section>
      }
    </main>
  `,
  styles: [`
    main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
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
  `]
})
export class CategoryOverviewPageComponent {
  // TODO: Get from store
  categories = [
    {
      key: 'time_sensitivity',
      name: 'Time Sensitivity',
      description: 'How urgent is this task? When does it need to be done?',
      completed: false
    },
    {
      key: 'impact',
      name: 'Impact',
      description: 'How important is this task? What happens if it\'s not done?',
      completed: false
    },
    {
      key: 'effort',
      name: 'Effort Required',
      description: 'How much work is needed to complete this task?',
      completed: false
    },
    {
      key: 'energy_level',
      name: 'Energy Level',
      description: 'How much mental/physical energy does this task require?',
      completed: false
    }
  ];
  
  get completedCategories() {
    return this.categories.filter(c => c.completed).length;
  }
  
  get canShowResults() {
    return this.completedCategories >= 2;
  }
}