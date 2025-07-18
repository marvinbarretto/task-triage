import { Injectable, inject } from '@angular/core';
import { BrainDumpInput, Task, AppConfig } from '../models';
import { TaskParser } from '../../utils/task-parser.util';
import { ConfigStore } from '../stores/config.store';

@Injectable({
  providedIn: 'root'
})
export class BulkInputService {
  private configStore = inject(ConfigStore);

  processBrainDump(rawText: string): BrainDumpInput {
    const config = this.configStore.config();
    const extractedTasks = TaskParser.parseTaskList(rawText, config.parsing);
    
    const processingNotes: string[] = [];
    
    // Add processing insights
    const format = TaskParser.detectFormat(rawText);
    processingNotes.push(`Detected format: ${format}`);
    processingNotes.push(`Extracted ${extractedTasks.length} tasks`);
    
    if (extractedTasks.length === 0) {
      processingNotes.push('No valid tasks found - try using bullet points or line breaks');
    } else if (extractedTasks.length > config.ui.maxTasksPerSession) {
      processingNotes.push(`Warning: ${extractedTasks.length} tasks exceeds recommended maximum of ${config.ui.maxTasksPerSession}`);
    }
    
    return {
      rawText,
      extractedTasks,
      processingNotes
    };
  }

  createTasksFromExtracted(extractedTasks: string[]): Task[] {
    const now = new Date();
    
    return extractedTasks.map((content, index) => ({
      id: `task_${Date.now()}_${index}`,
      content: content.trim(),
      createdAt: now,
      updatedAt: now
    }));
  }

  validateBrainDump(rawText: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!rawText.trim()) {
      errors.push('Please enter some tasks to get started');
    }
    
    if (rawText.trim().length < 10) {
      errors.push('Please enter more detailed tasks');
    }
    
    const config = this.configStore.config();
    const processed = this.processBrainDump(rawText);
    
    if (processed.extractedTasks.length === 0) {
      errors.push('No valid tasks could be extracted from your input');
    }
    
    if (processed.extractedTasks.length > config.ui.maxTasksPerSession) {
      errors.push(`Too many tasks (${processed.extractedTasks.length}). Please limit to ${config.ui.maxTasksPerSession} tasks per session`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}