import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./features/dashboard/feature/dashboard-kanban.component').then(c => c.DashboardKanbanComponent)
  },
  { 
    path: 'brain-dump', 
    loadComponent: () => import('./features/brain-dump/feature/brain-dump-page.component').then(c => c.BrainDumpPageComponent)
  },
  { 
    path: 'overview', 
    loadComponent: () => import('./features/category-overview/feature/category-overview-page.component').then(c => c.CategoryOverviewPageComponent)
  },
  { 
    path: 'triage/:category', 
    loadComponent: () => import('./features/triage/feature/triage-page.component').then(c => c.TriagePageComponent)
  },
  { 
    path: 'results', 
    loadComponent: () => import('./features/results/feature/results-page.component').then(c => c.ResultsPageComponent)
  },
  { 
    path: '**', 
    redirectTo: '' 
  }
];
