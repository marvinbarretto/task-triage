import { Component, signal } from '@angular/core';
import { AppLayoutComponent } from './core/layout/app-layout.component';

@Component({
  selector: 'app-root',
  imports: [AppLayoutComponent],
  template: `<app-layout></app-layout>`,
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('Task Triage');
}
