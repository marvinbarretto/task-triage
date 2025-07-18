import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TriageSessionStore } from '@shared/data-access/stores/triage-session.store';
import { BulkInputService } from '@shared/data-access/services/bulk-input.service';

@Component({
  selector: 'app-brain-dump-column',
  imports: [ReactiveFormsModule],
  template: `
    <div class="brain-dump-content">
      @if (!session()) {
        <form [formGroup]="brainDumpForm" (ngSubmit)="onSubmit()">
          <label for="task-input">Enter your tasks:</label>
          <textarea 
            id="task-input" 
            formControlName="taskInput"
            rows="8" 
            [placeholder]="placeholder">
          </textarea>
          
          <button 
            type="submit" 
            [disabled]="brainDumpForm.invalid || isProcessing"
            class="process-btn">
            {{isProcessing ? 'Processing...' : 'Process Tasks'}}
          </button>
        </form>
        
        @if (errorMessage) {
          <div class="error-message" role="alert">
            {{errorMessage}}
          </div>
        }
      } @else {
        <div class="session-active">
          <div class="task-count">
            <h3>{{session()?.tasks?.length || 0}} Tasks Ready</h3>
            <p>Tasks have been processed and are ready for evaluation</p>
          </div>
          
          <div class="task-preview">
            <h4>Sample Tasks:</h4>
            <ul>
              @for (task of session()?.tasks?.slice(0, 4); track task.id) {
                <li>{{task.content}}</li>
              }
              @if ((session()?.tasks?.length || 0) > 4) {
                <li class="more-tasks">+{{(session()?.tasks?.length || 0) - 4}} more tasks...</li>
              }
            </ul>
          </div>
          
          <button (click)="startNewSession()" class="new-session-btn">
            Start New Session
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .brain-dump-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: 100%;
    }
    
    label {
      font-weight: 600;
      color: #333;
    }
    
    textarea {
      flex: 1;
      padding: 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      resize: vertical;
      min-height: 200px;
    }
    
    textarea:focus {
      border-color: #007acc;
      outline: none;
    }
    
    .process-btn {
      padding: 0.75rem 1.5rem;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    
    .process-btn:hover:not(:disabled) {
      background: #005a9e;
    }
    
    .process-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .error-message {
      color: #d32f2f;
      padding: 0.75rem;
      background: #ffeaea;
      border: 1px solid #d32f2f;
      border-radius: 4px;
      margin-top: 1rem;
    }
    
    .session-active {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      height: 100%;
    }
    
    .task-count h3 {
      color: #28a745;
      margin: 0 0 0.5rem 0;
    }
    
    .task-count p {
      color: #666;
      margin: 0;
      font-size: 0.9rem;
    }
    
    .task-preview {
      flex: 1;
      background: white;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }
    
    .task-preview h4 {
      margin: 0 0 0.75rem 0;
      color: #333;
      font-size: 0.9rem;
    }
    
    .task-preview ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .task-preview li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 0.85rem;
      color: #666;
    }
    
    .task-preview li:last-child {
      border-bottom: none;
    }
    
    .more-tasks {
      font-style: italic;
      color: #999;
    }
    
    .new-session-btn {
      padding: 0.75rem 1.5rem;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }
    
    .new-session-btn:hover {
      background: #218838;
    }
  `]
})
export class BrainDumpColumnComponent {
  private fb = inject(FormBuilder);
  private sessionStore = inject(TriageSessionStore);
  private bulkInputService = inject(BulkInputService);
  
  session = this.sessionStore.session;
  
  brainDumpForm = this.fb.group({
    taskInput: [this.getSampleTasks(), [Validators.required, Validators.minLength(10)]]
  });
  
  isProcessing = false;
  errorMessage = '';
  
  placeholder = `Enter your tasks here...

Examples:
• Call dentist about appointment
• Finish quarterly report
• Review team feedback
• Plan weekend trip`;

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
      
      // Create tasks
      const tasks = this.bulkInputService.createTasksFromExtracted(brainDumpResult.extractedTasks);
      
      // Start new session
      this.sessionStore.startNewSession(tasks);
      
      console.log(`Created ${tasks.length} tasks`);
    } catch (error) {
      this.errorMessage = 'Something went wrong processing your tasks. Please try again.';
      console.error('Brain dump processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  startNewSession() {
    this.sessionStore.clearSession();
    this.brainDumpForm.reset();
    this.brainDumpForm.patchValue({
      taskInput: this.getSampleTasks()
    });
  }
}