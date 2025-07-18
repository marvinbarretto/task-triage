import { Injectable, inject } from '@angular/core';
import { TriageSession, SessionSummary, AppConfig } from '../models';
import { SsrPlatformService } from '@fourfold/angular-foundation';


@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private platform = inject(SsrPlatformService);

  private readonly STORAGE_KEYS = {
    CURRENT_SESSION: 'triage_current_session',
    SESSION_HISTORY: 'triage_session_history',
    USER_CONFIG: 'triage_user_config'
  };

  // Session Management
  async saveCurrentSession(session: TriageSession): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      try {
        const serializedSession = this.serializeSession(session);
        localStorage.setItem(this.STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(serializedSession));

        // Also save to history
        this.addToSessionHistory(session);
      } catch (error) {
        console.error('Failed to save current session:', error);
        throw new Error('Failed to save session');
      }
    }) || Promise.resolve();
  }

  async loadCurrentSession(): Promise<TriageSession | null> {
    return this.platform.onlyOnBrowser(() => {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEYS.CURRENT_SESSION);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        return this.deserializeSession(parsed);
      } catch (error) {
        console.error('Failed to load current session:', error);
        return null;
      }
    }) || Promise.resolve(null);
  }

  async clearCurrentSession(): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      localStorage.removeItem(this.STORAGE_KEYS.CURRENT_SESSION);
    }) || Promise.resolve();
  }

  // Session History
  async getSessionHistory(): Promise<SessionSummary[]> {
    return this.platform.onlyOnBrowser(() => {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEYS.SESSION_HISTORY);
        if (!stored) return [];

        const history = JSON.parse(stored);
        return history.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }));
      } catch (error) {
        console.error('Failed to load session history:', error);
        return [];
      }
    }) || Promise.resolve([]);
  }

  private addToSessionHistory(session: TriageSession): void {
    this.platform.onlyOnBrowser(() => {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEYS.SESSION_HISTORY);
        const history = stored ? JSON.parse(stored) : [];

        const summary: SessionSummary = {
          id: session.id,
          taskCount: session.tasks.length,
          completedCategories: session.categoryProgress.completedCount,
          totalCategories: Object.keys(session.categoryProgress.categories).length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        };

        // Add to beginning and keep only last 10 sessions
        const updatedHistory = [summary, ...history.filter((h: any) => h.id !== session.id)]
          .slice(0, 10);

        localStorage.setItem(this.STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error('Failed to update session history:', error);
      }
    });
  }

  async deleteSessionFromHistory(sessionId: string): Promise<void> {
    return this.platform.onlyOnBrowser(async () => {
      try {
        const history = await this.getSessionHistory();
        const filtered = history.filter(h => h.id !== sessionId);
        localStorage.setItem(this.STORAGE_KEYS.SESSION_HISTORY, JSON.stringify(filtered));
      } catch (error) {
        console.error('Failed to delete session from history:', error);
        throw new Error('Failed to delete session');
      }
    }) || Promise.resolve();
  }

  // Configuration Management
  async saveUserConfig(config: AppConfig): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      try {
        localStorage.setItem(this.STORAGE_KEYS.USER_CONFIG, JSON.stringify(config));
      } catch (error) {
        console.error('Failed to save user config:', error);
        throw new Error('Failed to save configuration');
      }
    }) || Promise.resolve();
  }

  async loadUserConfig(): Promise<AppConfig | null> {
    return this.platform.onlyOnBrowser(() => {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEYS.USER_CONFIG);
        if (!stored) return null;

        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load user config:', error);
        return null;
      }
    }) || Promise.resolve(null);
  }

  async clearUserConfig(): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      localStorage.removeItem(this.STORAGE_KEYS.USER_CONFIG);
    }) || Promise.resolve();
  }

  // Export/Import
  async exportSession(session: TriageSession, format: 'json' | 'csv' | 'text'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(this.serializeSession(session), null, 2);

      case 'csv':
        return this.sessionToCsv(session);

      case 'text':
        return this.sessionToText(session);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Utility Methods
  private serializeSession(session: TriageSession): any {
    return {
      ...session,
      evaluations: Array.from(session.evaluations.entries()),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString()
    };
  }

  private deserializeSession(data: any): TriageSession {
    return {
      ...data,
      evaluations: new Map(data.evaluations || []),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  private sessionToCsv(session: TriageSession): string {
    const headers = ['Task', 'Time Sensitivity', 'Impact', 'Effort', 'Energy Level'];
    const rows = [headers.join(',')];

    session.tasks.forEach(task => {
      const evaluation = session.evaluations.get(task.id) || {};
      const row = [
        `"${task.content}"`,
        evaluation['time_sensitivity'] || '',
        evaluation['impact'] || '',
        evaluation['effort'] || '',
        evaluation['energy_level'] || ''
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
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

  // Storage utilities
  getStorageUsage(): { used: number; available: number; percentage: number } {
    return this.platform.onlyOnBrowser(() => {
      try {
        let used = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length;
          }
        }

        // Rough estimate of localStorage limit (usually 5-10MB)
        const available = 5 * 1024 * 1024; // 5MB
        const percentage = (used / available) * 100;

        return { used, available, percentage };
      } catch (error) {
        return { used: 0, available: 0, percentage: 0 };
      }
    }) || { used: 0, available: 0, percentage: 0 };
  }

  async clearAllData(): Promise<void> {
    return this.platform.onlyOnBrowser(() => {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }) || Promise.resolve();
  }
}
