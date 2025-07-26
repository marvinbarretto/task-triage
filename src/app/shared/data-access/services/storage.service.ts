import { Injectable } from '@angular/core';
import { StorageService as BaseStorageService } from 'angular-foundation';
import { TriageSession, SessionSummary, AppConfig } from '../models';

/**
 * App-specific Storage Service that extends the generic StorageService
 * Provides triage-specific session and configuration management
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService extends BaseStorageService {

  private readonly STORAGE_KEYS = {
    CURRENT_SESSION: 'triage_current_session',
    SESSION_HISTORY: 'triage_session_history',
    USER_CONFIG: 'triage_user_config'
  };

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  async saveCurrentSession(session: TriageSession): Promise<void> {
    try {
      const serializedSession = this.serializeSession(session);
      await this.setObject(this.STORAGE_KEYS.CURRENT_SESSION, serializedSession);
      
      // Also save to history
      await this.addToSessionHistory(session);
    } catch (error) {
      console.error('Failed to save current session:', error);
      throw new Error('Failed to save session');
    }
  }

  async loadCurrentSession(): Promise<TriageSession | null> {
    try {
      const stored = await this.getObject<any>(this.STORAGE_KEYS.CURRENT_SESSION);
      if (!stored) return null;
      
      return this.deserializeSession(stored);
    } catch (error) {
      console.error('Failed to load current session:', error);
      return null;
    }
  }

  async clearCurrentSession(): Promise<void> {
    this.removeItem(this.STORAGE_KEYS.CURRENT_SESSION);
  }

  // ========================================
  // SESSION HISTORY
  // ========================================

  async getSessionHistory(): Promise<SessionSummary[]> {
    try {
      const history = await this.getArray<any>(this.STORAGE_KEYS.SESSION_HISTORY);
      return history.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load session history:', error);
      return [];
    }
  }

  private async addToSessionHistory(session: TriageSession): Promise<void> {
    try {
      const summary: SessionSummary = {
        id: session.id,
        taskCount: session.tasks.length,
        completedCategories: session.categoryProgress.completedCount,
        totalCategories: Object.keys(session.categoryProgress.categories).length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };

      // Remove existing entry with same ID, then add to beginning with max 10 items
      await this.removeFromArray(this.STORAGE_KEYS.SESSION_HISTORY, (h: any) => h.id === session.id);
      await this.addToArray(this.STORAGE_KEYS.SESSION_HISTORY, summary, 10);
    } catch (error) {
      console.error('Failed to update session history:', error);
    }
  }

  async deleteSessionFromHistory(sessionId: string): Promise<void> {
    try {
      await this.removeFromArray(this.STORAGE_KEYS.SESSION_HISTORY, (h: any) => h.id === sessionId);
    } catch (error) {
      console.error('Failed to delete session from history:', error);
      throw new Error('Failed to delete session');
    }
  }

  // ========================================
  // CONFIGURATION MANAGEMENT
  // ========================================

  async saveUserConfig(config: AppConfig): Promise<void> {
    try {
      await this.setObject(this.STORAGE_KEYS.USER_CONFIG, config);
    } catch (error) {
      console.error('Failed to save user config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  async loadUserConfig(): Promise<AppConfig | null> {
    try {
      return await this.getObject<AppConfig>(this.STORAGE_KEYS.USER_CONFIG);
    } catch (error) {
      console.error('Failed to load user config:', error);
      return null;
    }
  }

  async clearUserConfig(): Promise<void> {
    this.removeItem(this.STORAGE_KEYS.USER_CONFIG);
  }

  // ========================================
  // EXPORT/IMPORT FUNCTIONALITY
  // ========================================

  async exportSession(session: TriageSession, format: 'json' | 'csv' | 'text'): Promise<string> {
    switch (format) {
      case 'json':
        return this.exportToJson(this.serializeSession(session));

      case 'csv':
        return this.sessionToCsv(session);

      case 'text':
        return this.sessionToText(session);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // ========================================
  // APP-SPECIFIC UTILITIES
  // ========================================

  async clearAppData(): Promise<void> {
    await this.clearItems(Object.values(this.STORAGE_KEYS));
  }

  // ========================================
  // PRIVATE UTILITY METHODS
  // ========================================

  private serializeSession(session: TriageSession): any {
    return this.serializeForStorage(session, ['createdAt', 'updatedAt']);
  }

  private deserializeSession(data: any): TriageSession {
    return this.deserializeFromStorage<TriageSession>(
      data, 
      ['createdAt', 'updatedAt'], 
      ['evaluations']
    );
  }

  private sessionToCsv(session: TriageSession): string {
    const headers = ['Task', 'Time Sensitivity', 'Impact', 'Effort', 'Energy Level'];
    const csvData = session.tasks.map(task => {
      const evaluation = session.evaluations.get(task.id) || {};
      return {
        'Task': task.content,
        'Time Sensitivity': evaluation['time_sensitivity'] || '',
        'Impact': evaluation['impact'] || '',
        'Effort': evaluation['effort'] || '',
        'Energy Level': evaluation['energy_level'] || ''
      };
    });

    return this.exportToCsv(csvData, headers);
  }

  private sessionToText(session: TriageSession): string {
    const lines = [
      `Task Triage Session - ${session.createdAt.toLocaleDateString()}`,
      `${session.tasks.length} tasks, ${session.categoryProgress.completedCount} categories completed`,
      '',
      'Tasks:'
    ];

    session.tasks.forEach((task, index) => {
      lines.push(`${index + 1}. ${task.content}`);
    });

    return lines.join('\n');
  }
}