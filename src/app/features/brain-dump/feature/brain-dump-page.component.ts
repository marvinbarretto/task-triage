import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BulkInputService } from '@shared/data-access/services/bulk-input.service';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';

@Component({
  selector: 'app-brain-dump-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-content">
      <h1>Task Brain Dump</h1>
      <p>Get everything out of your head. Paste your tasks, thoughts, or notes below:</p>

      <form [formGroup]="brainDumpForm" (ngSubmit)="onSubmit()">
        <label for="task-input">Your tasks:</label>
        <textarea
          id="task-input"
          formControlName="taskInput"
          rows="12"
          [placeholder]="placeholder">
        </textarea>

        <button
          type="submit"
          [disabled]="brainDumpForm.invalid || isProcessing">
          {{isProcessing ? 'Processing...' : 'Start Triage'}}
        </button>
      </form>

      @if (errorMessage) {
        <div role="alert" class="error">
          {{errorMessage}}
        </div>
      }
      
      @if (processingNotes.length > 0) {
        <div class="processing-notes">
          <h3>Processing Results:</h3>
          <ul>
            @for (note of processingNotes; track note) {
              <li>{{note}}</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-content {
      max-width: 800px;
      margin: 0 auto;
    }

    textarea {
      width: 100%;
      min-height: 300px;
      padding: 1rem;
      border: 2px solid #ccc;
      border-radius: 4px;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.5;
      resize: vertical;
    }

    textarea:focus {
      border-color: #007acc;
      outline: none;
    }

    button {
      padding: 0.75rem 2rem;
      font-size: 1.1rem;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    button:hover:not(:disabled) {
      background: #005a9e;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }

    .error {
      color: #d32f2f;
      margin-top: 1rem;
      padding: 0.5rem;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      background: #ffeaea;
    }
    
    .processing-notes {
      margin-top: 1rem;
      padding: 1rem;
      background: #f0f8ff;
      border: 1px solid #007acc;
      border-radius: 4px;
    }
    
    .processing-notes h3 {
      margin: 0 0 0.5rem 0;
      color: #007acc;
    }
    
    .processing-notes ul {
      margin: 0;
      padding-left: 1.5rem;
    }
    
    .processing-notes li {
      margin-bottom: 0.25rem;
    }
  `]
})
export class BrainDumpPageComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private bulkInputService = inject(BulkInputService);
  private sessionStore = inject(TriageSessionStore);

  brainDumpForm = this.fb.group({
    taskInput: [this.getSampleTasks(), [Validators.required, Validators.minLength(3)]]
  });

  isProcessing = false;
  errorMessage = '';
  processingNotes: string[] = [];

  placeholder = `Paste your tasks, thoughts, or notes here...

Examples:
• Call dentist about appointment
• Finish quarterly report
• Review team feedback
• Plan weekend trip
• Fix kitchen sink
• Update resume`;

  private getSampleTasks(): string {
    return `• Finish quarterly sales report for management review
• Call dentist to schedule root canal appointment  
• Review and respond to team feedback on project proposal
• Plan weekend trip to Portland with family
• Fix leaky kitchen sink faucet
• Update resume with recent Angular 20 experience
• Prepare presentation for client meeting next Tuesday
• Buy groceries for dinner party this Saturday
• Research new health insurance options during open enrollment
• Schedule car maintenance and oil change
• Organize home office and file important documents
• Learn TypeScript advanced patterns for work project`;
  }

  async onSubmit() {
    if (this.brainDumpForm.invalid) {
      this.errorMessage = 'Please enter some tasks to get started.';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.processingNotes = [];

    try {
      const inputText = this.brainDumpForm.value.taskInput!;

      // Validate input
      const validation = this.bulkInputService.validateBrainDump(inputText);
      if (!validation.isValid) {
        this.errorMessage = validation.errors.join('. ');
        return;
      }

      // Process brain dump
      const brainDumpResult = this.bulkInputService.processBrainDump(inputText);
      this.processingNotes = brainDumpResult.processingNotes;

      // Create tasks
      const tasks = this.bulkInputService.createTasksFromExtracted(brainDumpResult.extractedTasks);

      // Start new session
      this.sessionStore.startNewSession(tasks);

      console.log(`Created ${tasks.length} tasks:`, tasks);
      console.log('Processing notes:', this.processingNotes);

      // Navigate to overview
      await this.router.navigate(['/overview']);
    } catch (error) {
      this.errorMessage = 'Something went wrong processing your tasks. Please try again.';
      console.error('Brain dump processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
