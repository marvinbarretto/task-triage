import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';

@Component({
  selector: 'app-header',
  imports: [RouterModule],
  template: `
    <header class="site-header">
      <div class="header-container">
        <div class="brand">
          <h1 [routerLink]="['/']">Task Triage</h1>
          <span class="tagline">Prioritize with confidence</span>
        </div>

        <nav class="main-nav" aria-label="Main navigation">
          <ul>
            <li>
              <a [routerLink]="['/']" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                Dashboard
              </a>
            </li>
            <li>
              <a [routerLink]="['/smart-events']" routerLinkActive="active">
                Smart Events
              </a>
            </li>
            <li>
              <a [routerLink]="['/calendar']" routerLinkActive="active">
                Calendar
              </a>
            </li>
            <li>
              <a [routerLink]="['/results']" routerLinkActive="active">
                Results
              </a>
            </li>
          </ul>
        </nav>

        <div class="session-info">
          @if (session()) {
            <span class="task-count">{{session()?.tasks?.length || 0}} tasks</span>
            <span class="progress-count">{{categoryProgress().completedCount}}/4 complete</span>
          } @else {
            <span class="no-session">No active session</span>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .site-header {
      background: linear-gradient(135deg, #007acc 0%, #005a9e 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .brand h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      color: white;
    }

    .brand h1:hover {
      text-decoration: underline;
    }

    .tagline {
      font-size: 0.8rem;
      opacity: 0.9;
      font-style: italic;
    }

    .main-nav ul {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 2rem;
    }

    .main-nav a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.2s;
      font-weight: 500;
    }

    .main-nav a:hover {
      background-color: rgba(255,255,255,0.1);
    }

    .main-nav a.active {
      background-color: rgba(255,255,255,0.2);
      font-weight: 600;
    }

    .session-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
      font-size: 0.9rem;
    }

    .task-count {
      font-weight: 600;
    }

    .progress-count {
      opacity: 0.9;
    }

    .no-session {
      opacity: 0.7;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .header-container {
        flex-direction: column;
        gap: 1rem;
      }

      .main-nav ul {
        gap: 1rem;
      }

      .session-info {
        align-items: center;
      }
    }
  `]
})
export class HeaderComponent {
  private sessionStore = inject(TriageSessionStore);

  session = this.sessionStore.session;
  categoryProgress = this.sessionStore.categoryProgress;
}
