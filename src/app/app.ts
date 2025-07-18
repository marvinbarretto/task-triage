import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SsrPlatformService } from '../../projects/angular-foundation/src/lib/ssr/platform.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('task-triage');

  constructor(private platform: SsrPlatformService) {
    console.log('🔍 Testing SsrPlatformService:');
    console.log('Is Browser:', this.platform.isBrowser);
    console.log('Is Server:', this.platform.isServer);
    console.log('Window Width Signal:', this.platform.windowWidth());
    console.log('Window Object:', this.platform.getWindow());

    // Test the context logging
    this.platform.logContext('App Component Constructor');

    // Test browser-only callback
    this.platform.onlyOnBrowser(() => {
      console.log('✅ This only runs in browser!');
      return 'browser-specific-data';
    });
  }
}
