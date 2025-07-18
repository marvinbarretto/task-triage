import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <div class="app-layout">
      <app-header></app-header>
      
      <main class="main-content" role="main">
        <router-outlet></router-outlet>
      </main>
      
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .main-content {
      flex: 1;
      padding: 2rem 0;
    }
    
    /* Ensure pages don't add their own top padding */
    .main-content > * {
      padding-top: 0;
    }
  `]
})
export class AppLayoutComponent {}