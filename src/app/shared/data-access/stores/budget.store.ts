import { Injectable, signal, computed, inject } from '@angular/core';
import { BudgetCategory, BudgetEntry, BudgetSummary, BudgetFilter, WeeklyBudgetProgress } from '../models/budget.model';
import { EVENT_TAG_COLORS, EventTagConfig } from '@shared/utils/event-tags.constants';
import { StorageService } from '../services/storage.service';

interface BudgetSession {
  id: string;
  categories: BudgetCategory[];
  entries: BudgetEntry[];
  currentWeekStart: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetStore {
  private storageService = inject(StorageService);
  
  private sessionSignal = signal<BudgetSession | null>(null);
  
  // Public readonly signals
  readonly session = this.sessionSignal.asReadonly();
  readonly categories = computed(() => this.session()?.categories || []);
  readonly entries = computed(() => this.session()?.entries || []);
  readonly currentWeekStart = computed(() => this.session()?.currentWeekStart || this.getWeekStart(new Date()));
  
  // Computed budget analytics
  readonly weeklyBudgetSummary = computed(() => this.calculateWeeklyBudgetSummary());
  readonly budgetProgressByCategory = computed(() => this.calculateBudgetProgress());
  readonly totalWeeklyTimeAllocation = computed(() => this.categories().reduce((sum, cat) => sum + cat.weeklyTimeAllocation, 0));
  readonly totalWeeklyTimeSpent = computed(() => this.getCurrentWeekEntries().reduce((sum, entry) => sum + entry.timeSpent, 0));
  readonly remainingTime = computed(() => this.totalWeeklyTimeAllocation() - this.totalWeeklyTimeSpent());
  readonly overTimeCategories = computed(() => 
    this.budgetProgressByCategory().filter(prog => prog.isOverTime).map(prog => prog.categoryTagKey)
  );
  
  // Helper computed values
  readonly hasCategories = computed(() => this.categories().length > 0);
  readonly hasEntries = computed(() => this.entries().length > 0);
  readonly budgetHealthStatus = computed(() => {
    const remaining = this.remainingTime();
    const total = this.totalWeeklyTimeAllocation();
    
    if (remaining < 0) return 'over_time';
    if (remaining / total < 0.2) return 'warning';
    return 'healthy';
  });
  
  // Actions
  initializeBudgetSession(): void {
    const existingSession = this.loadSessionFromStorage();
    
    if (existingSession) {
      this.sessionSignal.set(existingSession);
      console.log('[BudgetStore] Existing budget session loaded');
    } else {
      this.createNewSession();
    }
  }
  
  createNewSession(): void {
    const now = new Date();
    
    const defaultCategories = this.createDefaultCategories();
    
    const newSession: BudgetSession = {
      id: `budget_session_${Date.now()}`,
      categories: defaultCategories,
      entries: [],
      currentWeekStart: this.getWeekStart(now),
      createdAt: now,
      updatedAt: now
    };
    
    console.log('[BudgetStore] New budget session created');
    this.sessionSignal.set(newSession);
    this.saveSessionToStorage();
  }
  
  addBudgetCategory(tagKey: string, weeklyTimeAllocation: number): void {
    const tagConfig = EVENT_TAG_COLORS[tagKey];
    if (!tagConfig) {
      console.warn(`[BudgetStore] Invalid tag key: ${tagKey}`);
      return;
    }
    
    const newCategory: BudgetCategory = {
      id: `category_${Date.now()}`,
      tagKey,
      name: tagConfig.label,
      emoji: tagConfig.emoji,
      color: tagConfig.color,
      weeklyTimeAllocation,
      weeklyTimeSpent: 0,
      lastUpdated: new Date()
    };
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedCategories = [...session.categories, newCategory];
      const updated = {
        ...session,
        categories: updatedCategories,
        updatedAt: new Date()
      };
      
      this.saveSessionToStorage(updated);
      return updated;
    });
    
    console.log(`[BudgetStore] Category added: ${tagConfig.label} - ${weeklyTimeAllocation}h/week`);
  }
  
  updateCategoryTimeAllocation(categoryId: string, newWeeklyTimeAllocation: number): void {
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedCategories = session.categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, weeklyTimeAllocation: newWeeklyTimeAllocation, lastUpdated: new Date() }
          : cat
      );
      
      const updated = {
        ...session,
        categories: updatedCategories,
        updatedAt: new Date()
      };
      
      this.saveSessionToStorage(updated);
      return updated;
    });
    
    console.log(`[BudgetStore] Category time allocation updated: ${categoryId} - ${newWeeklyTimeAllocation}h/week`);
  }
  
  addTimeEntry(categoryTagKey: string, timeSpent: number, description: string, eventId?: string): void {
    const newEntry: BudgetEntry = {
      id: `entry_${Date.now()}`,
      categoryTagKey,
      timeSpent,
      description,
      date: new Date(),
      eventId,
      isRecurring: false,
      createdAt: new Date()
    };
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedEntries = [...session.entries, newEntry];
      
      // Update category spent amount
      const updatedCategories = session.categories.map(cat => {
        if (cat.tagKey === categoryTagKey) {
          const weeklyTimeSpent = this.calculateWeeklyTimeSpentForCategory(categoryTagKey, updatedEntries);
          return { ...cat, weeklyTimeSpent, lastUpdated: new Date() };
        }
        return cat;
      });
      
      const updated = {
        ...session,
        categories: updatedCategories,
        entries: updatedEntries,
        updatedAt: new Date()
      };
      
      this.saveSessionToStorage(updated);
      return updated;
    });
    
    console.log(`[BudgetStore] Time entry added: ${timeSpent}h for ${categoryTagKey}`);
  }
  
  deleteTimeEntry(entryId: string): void {
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const entryToDelete = session.entries.find(e => e.id === entryId);
      if (!entryToDelete) return session;
      
      const updatedEntries = session.entries.filter(e => e.id !== entryId);
      
      // Update category spent amount
      const updatedCategories = session.categories.map(cat => {
        if (cat.tagKey === entryToDelete.categoryTagKey) {
          const weeklyTimeSpent = this.calculateWeeklyTimeSpentForCategory(entryToDelete.categoryTagKey, updatedEntries);
          return { ...cat, weeklyTimeSpent, lastUpdated: new Date() };
        }
        return cat;
      });
      
      const updated = {
        ...session,
        categories: updatedCategories,
        entries: updatedEntries,
        updatedAt: new Date()
      };
      
      this.saveSessionToStorage(updated);
      return updated;
    });
    
    console.log(`[BudgetStore] Time entry deleted: ${entryId}`);
  }
  
  // Event integration - when calendar events are created
  onCalendarEventCreated(eventId: string, tags: string[], estimatedTimeHours?: number): void {
    // Look for time-relevant tags and create time entries
    const timeRelevantTags = tags.filter(tag => 
      ['work', 'social', 'entertainment', 'travel', 'home', 'health', 'learning'].includes(tag)
    );
    
    if (timeRelevantTags.length > 0 && estimatedTimeHours && estimatedTimeHours > 0) {
      // For simplicity, assign to the first relevant tag
      const primaryTag = timeRelevantTags[0];
      this.addTimeEntry(
        primaryTag, 
        estimatedTimeHours, 
        `Auto-added from calendar event`,
        eventId
      );
    }
  }
  
  // Helper methods
  getCategoryByTagKey(tagKey: string): BudgetCategory | undefined {
    return this.categories().find(cat => cat.tagKey === tagKey);
  }
  
  getEntriesForCategory(tagKey: string): BudgetEntry[] {
    return this.entries().filter(entry => entry.categoryTagKey === tagKey);
  }
  
  getEntriesForDateRange(startDate: Date, endDate: Date): BudgetEntry[] {
    return this.entries().filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }
  
  private getCurrentWeekEntries(): BudgetEntry[] {
    const weekStart = this.currentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return this.getEntriesForDateRange(weekStart, weekEnd);
  }
  
  private calculateWeeklyTimeSpentForCategory(tagKey: string, entries: BudgetEntry[]): number {
    const weekStart = this.currentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return entries
      .filter(entry => entry.categoryTagKey === tagKey)
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate < weekEnd;
      })
      .reduce((sum, entry) => sum + entry.timeSpent, 0);
  }
  
  private calculateWeeklyBudgetSummary(): BudgetSummary {
    const weekStart = this.currentWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const categories = this.categories();
    const totalTimeAllocation = categories.reduce((sum, cat) => sum + cat.weeklyTimeAllocation, 0);
    const totalTimeSpent = this.totalWeeklyTimeSpent();
    
    return {
      totalWeeklyTimeAllocation: totalTimeAllocation,
      totalWeeklyTimeSpent: totalTimeSpent,
      remainingTime: totalTimeAllocation - totalTimeSpent,
      categories: categories,
      overTimeCategories: this.overTimeCategories(),
      weekStartDate: weekStart,
      weekEndDate: weekEnd
    };
  }
  
  private calculateBudgetProgress(): WeeklyBudgetProgress[] {
    return this.categories().map(category => {
      const spent = category.weeklyTimeSpent;
      const allocated = category.weeklyTimeAllocation;
      const remaining = allocated - spent;
      const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
      
      return {
        categoryTagKey: category.tagKey,
        allocated,
        spent,
        remaining,
        percentUsed,
        isOverTime: spent > allocated,
        config: EVENT_TAG_COLORS[category.tagKey]
      };
    });
  }
  
  private createDefaultCategories(): BudgetCategory[] {
    const defaultTimeAllocations = [
      { tag: 'work', allocation: 40 }, // 40 hours per week for work
      { tag: 'social', allocation: 8 }, // 8 hours per week for social activities
      { tag: 'entertainment', allocation: 6 }, // 6 hours per week for entertainment
      { tag: 'health', allocation: 5 }, // 5 hours per week for health/exercise
      { tag: 'learning', allocation: 4 }, // 4 hours per week for learning
      { tag: 'home', allocation: 8 } // 8 hours per week for home/chores
    ];
    
    return defaultTimeAllocations.map(({ tag, allocation }) => {
      const config = EVENT_TAG_COLORS[tag];
      return {
        id: `category_${tag}_${Date.now()}`,
        tagKey: tag,
        name: config.label,
        emoji: config.emoji,
        color: config.color,
        weeklyTimeAllocation: allocation,
        weeklyTimeSpent: 0,
        lastUpdated: new Date()
      };
    });
  }
  
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday = 0
    return new Date(d.setDate(diff));
  }
  
  private loadSessionFromStorage(): BudgetSession | null {
    try {
      const stored = this.storageService.getItem('budget-session');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return {
          ...parsed,
          currentWeekStart: new Date(parsed.currentWeekStart),
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          categories: parsed.categories.map((cat: any) => ({
            ...cat,
            lastUpdated: new Date(cat.lastUpdated)
          })),
          entries: parsed.entries.map((entry: any) => ({
            ...entry,
            date: new Date(entry.date),
            createdAt: new Date(entry.createdAt)
          }))
        };
      }
    } catch (error) {
      console.warn('[BudgetStore] Failed to load session from storage:', error);
    }
    
    return null;
  }
  
  private saveSessionToStorage(session?: BudgetSession): void {
    try {
      const sessionToSave = session || this.session();
      if (sessionToSave) {
        this.storageService.setItem('budget-session', JSON.stringify(sessionToSave));
      }
    } catch (error) {
      console.warn('[BudgetStore] Failed to save session to storage:', error);
    }
  }
}