import { EventTagConfig } from '@shared/utils/event-tags.constants';

export interface BudgetCategory {
  id: string;
  tagKey: string; // Maps to event tag (e.g., 'work', 'social', 'entertainment')
  name: string;
  emoji: string;
  color: string;
  weeklyTimeAllocation: number; // Allocated time in hours per week
  weeklyTimeSpent: number; // Time spent in hours this week
  lastUpdated: Date;
}

export interface BudgetEntry {
  id: string;
  categoryTagKey: string; // References the tag key
  timeSpent: number; // Time spent in hours
  description: string;
  date: Date;
  eventId?: string; // Optional reference to calendar event
  isRecurring: boolean;
  createdAt: Date;
}

export interface BudgetSummary {
  totalWeeklyTimeAllocation: number; // Total allocated time in hours
  totalWeeklyTimeSpent: number; // Total time spent in hours
  remainingTime: number; // Remaining time in hours
  categories: BudgetCategory[];
  overTimeCategories: string[]; // Categories that exceeded time allocation
  weekStartDate: Date;
  weekEndDate: Date;
}

export interface BudgetFilter {
  startDate?: Date;
  endDate?: Date;
  categoryTagKeys?: string[];
  minTimeSpent?: number; // Minimum time in hours
  maxTimeSpent?: number; // Maximum time in hours
}

export interface WeeklyBudgetProgress {
  categoryTagKey: string;
  allocated: number; // Time allocated in hours
  spent: number; // Time spent in hours
  remaining: number; // Remaining time in hours
  percentUsed: number;
  isOverTime: boolean; // Renamed from isOverBudget
  config: EventTagConfig;
}

// Utility functions for time formatting
export function formatTimeHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
  
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  
  return `${wholeHours}h ${minutes}m`;
}

export function parseTimeInput(input: string): number {
  // Parse inputs like "2h 30m", "1.5h", "90m" into hours
  const hourMatch = input.match(/(\d+(?:\.\d+)?)h/);
  const minuteMatch = input.match(/(\d+)m/);
  
  let totalHours = 0;
  
  if (hourMatch) {
    totalHours += parseFloat(hourMatch[1]);
  }
  
  if (minuteMatch) {
    totalHours += parseInt(minuteMatch[1]) / 60;
  }
  
  // If no pattern matches, treat as decimal hours
  if (!hourMatch && !minuteMatch) {
    const numericValue = parseFloat(input);
    if (!isNaN(numericValue)) {
      totalHours = numericValue;
    }
  }
  
  return Math.max(0, totalHours); // Ensure non-negative
}