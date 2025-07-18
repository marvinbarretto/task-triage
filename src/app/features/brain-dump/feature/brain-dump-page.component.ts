import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-brain-dump-page',
  imports: [ReactiveFormsModule],
  template: `
    <main>
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
        <div role="alert">
          {{errorMessage}}
        </div>
      }
    </main>
  `,
  styles: [`
    main {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
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
    
    [role="alert"] {
      color: #d32f2f;
      margin-top: 1rem;
      padding: 0.5rem;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      background: #ffeaea;
    }
  `]
})
export class BrainDumpPageComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  
  brainDumpForm = this.fb.group({
    taskInput: ['', [Validators.required, Validators.minLength(3)]]
  });
  
  isProcessing = false;
  errorMessage = '';
  
  placeholder = `Paste your tasks, thoughts, or notes here...

Examples:
• Call dentist about appointment
• Finish quarterly report
• Review team feedback
• Plan weekend trip
• Fix kitchen sink
• Update resume`;

  async onSubmit() {
    if (this.brainDumpForm.invalid) {
      this.errorMessage = 'Please enter some tasks to get started.';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      const inputText = this.brainDumpForm.value.taskInput!;
      // TODO: Process brain dump input with service
      console.log('Processing brain dump:', inputText);
      
      // For now, just navigate to overview
      await this.router.navigate(['/overview']);
    } catch (error) {
      this.errorMessage = 'Something went wrong processing your tasks. Please try again.';
      console.error('Brain dump processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}