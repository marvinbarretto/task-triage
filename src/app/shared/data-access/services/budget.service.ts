import { Injectable, inject } from '@angular/core';
import { BudgetStore } from '../stores/budget.store';
import { BudgetEntry, BudgetCategory, WeeklyBudgetProgress } from '../models/budget.model';
import { Event } from '../models/event.model';
import { EventTagsService } from './event-tags.service';
import { LLMService } from '../../../../../projects/angular-foundation/src/lib/llm/gemini.service';

export interface BudgetInsight {
  type: 'warning' | 'suggestion' | 'achievement';
  category: string;
  message: string;
  amount?: number;
  emoji: string;
}

export interface TimeExtraction {
  estimatedTimeHours: number;
  confidence: number;
  reasoning: string;
  suggestedCategory: string;
}

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private budgetStore = inject(BudgetStore);
  private eventTagsService = inject(EventTagsService);
  private llmService = inject(LLMService);

  constructor() {
    // Initialize budget session on service creation
    this.budgetStore.initializeBudgetSession();
  }

  /**
   * Initialize the budget system
   */
  initializeBudgets(): void {
    this.budgetStore.initializeBudgetSession();
  }

  /**
   * Add a new time allocation category
   */
  addTimeAllocationCategory(tagKey: string, weeklyTimeAllocation: number): void {
    this.budgetStore.addBudgetCategory(tagKey, weeklyTimeAllocation);
  }

  /**
   * Update weekly time allocation for a category
   */
  updateCategoryTimeAllocation(categoryId: string, newWeeklyTimeAllocation: number): void {
    this.budgetStore.updateCategoryTimeAllocation(categoryId, newWeeklyTimeAllocation);
  }

  /**
   * Add a time entry
   */
  addTimeEntry(categoryTagKey: string, timeSpent: number, description: string, eventId?: string): void {
    this.budgetStore.addTimeEntry(categoryTagKey, timeSpent, description, eventId);
  }

  /**
   * Delete a time entry
   */
  deleteTimeEntry(entryId: string): void {
    this.budgetStore.deleteTimeEntry(entryId);
  }

  /**
   * Extract time information from event text using LLM
   */
  async extractTimeFromEvent(title: string, description: string = ''): Promise<TimeExtraction | null> {
    try {
      const prompt = this.buildTimeExtractionPrompt(title, description);
      
      const response = await this.llmService.generateContent({
        prompt,
        model: 'gemini-1.5-flash-8b',
        temperature: 0.1
      });

      if (!response.success) {
        console.warn('[BudgetService] LLM time extraction failed:', response.error);
        return null;
      }

      return this.parseTimeExtractionResponse(response.data);
    } catch (error) {
      console.warn('[BudgetService] Failed to extract time from event:', error);
      return null;
    }
  }

  /**
   * Generate time allocation insights and recommendations using LLM
   */
  async generateTimeInsights(): Promise<BudgetInsight[]> {
    try {
      const summary = this.budgetStore.weeklyBudgetSummary();
      const progress = this.budgetStore.budgetProgressByCategory();
      
      const prompt = this.buildInsightsPrompt(summary, progress);
      
      const response = await this.llmService.generateContent({
        prompt,
        model: 'gemini-1.5-flash-8b',
        temperature: 0.3
      });

      if (!response.success) {
        console.warn('[BudgetService] LLM time insights generation failed:', response.error);
        return this.generateFallbackTimeInsights();
      }

      return this.parseInsightsResponse(response.data);
    } catch (error) {
      console.warn('[BudgetService] Failed to generate time insights:', error);
      return this.generateFallbackTimeInsights();
    }
  }

  /**
   * Process a calendar event for time allocation tracking
   */
  async processCalendarEventForTimeTracking(event: Event, tags: string[]): Promise<void> {
    // Check if event has time-relevant tags
    const timeRelevantTags = tags.filter(tag => 
      ['work', 'social', 'entertainment', 'travel', 'home', 'health', 'learning'].includes(tag)
    );

    if (timeRelevantTags.length === 0) {
      return; // No time tracking needed
    }

    // Try to extract time information
    const timeInfo = await this.extractTimeFromEvent(
      event.title, 
      event.description || ''
    );

    if (timeInfo && timeInfo.estimatedTimeHours > 0) {
      // Add time entry for the primary tag
      const primaryTag = timeRelevantTags[0];
      this.budgetStore.addTimeEntry(
        primaryTag,
        timeInfo.estimatedTimeHours,
        `Auto-extracted from: ${event.title}`,
        event.id
      );

      console.log(`[BudgetService] Auto-created time entry: ${timeInfo.estimatedTimeHours}h for ${primaryTag}`);
    }
  }

  /**
   * Get time allocation summary for a specific tag/category
   */
  getTimeAllocationSummaryForTag(tagKey: string): {
    weeklyTimeAllocation: number;
    weeklyTimeSpent: number;
    remaining: number;
    percentUsed: number;
    isOverTime: boolean;
  } | null {
    const category = this.budgetStore.getCategoryByTagKey(tagKey);
    if (!category) return null;

    const progress = this.budgetStore.budgetProgressByCategory()
      .find(p => p.categoryTagKey === tagKey);

    return progress ? {
      weeklyTimeAllocation: progress.allocated,
      weeklyTimeSpent: progress.spent,
      remaining: progress.remaining,
      percentUsed: progress.percentUsed,
      isOverTime: progress.isOverTime
    } : null;
  }

  /**
   * Export time tracking data as CSV
   */
  exportTimeTrackingData(): string {
    const entries = this.budgetStore.entries();
    const headers = ['Date', 'Category', 'Time Spent (Hours)', 'Description', 'Event ID'];
    
    const csvLines = [
      headers.join(','),
      ...entries.map(entry => [
        entry.date.toISOString().split('T')[0],
        entry.categoryTagKey,
        entry.timeSpent.toString(),
        `"${entry.description.replace(/"/g, '""')}"`, // Escape quotes
        entry.eventId || ''
      ].join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Get time allocation health status with visual indicators
   */
  getTimeAllocationHealthStatus(): {
    status: 'healthy' | 'warning' | 'over_time';
    message: string;
    color: string;
    emoji: string;
  } {
    const healthStatus = this.budgetStore.budgetHealthStatus();
    const remaining = this.budgetStore.remainingTime();
    
    switch (healthStatus) {
      case 'healthy':
        return {
          status: 'healthy',
          message: `${Math.abs(remaining).toFixed(1)}h remaining this week`,
          color: '#10b981',
          emoji: '💚'
        };
      case 'warning':
        return {
          status: 'warning',
          message: `Only ${Math.abs(remaining).toFixed(1)}h left this week`,
          color: '#f59e0b',
          emoji: '⚠️'
        };
      case 'over_time':
        return {
          status: 'over_time',
          message: `${Math.abs(remaining).toFixed(1)}h over allocated time this week`,
          color: '#ef4444',
          emoji: '🚨'
        };
      default:
        return {
          status: 'healthy',
          message: 'Time allocation status unknown',
          color: '#6b7280',
          emoji: '❓'
        };
    }
  }

  // Private helper methods
  private buildTimeExtractionPrompt(title: string, description: string): string {
    return `You are an expert at extracting expense information from calendar events and tasks.

EVENT DETAILS:
Title: "${title}"
Description: "${description || 'None'}"

TASK:
1. Analyze if this event involves spending money
2. If yes, estimate the likely cost in USD
3. Suggest which budget category it belongs to from: finance, social, entertainment, travel, home, nutrition
4. Provide confidence level (0-100) and reasoning

RESPONSE FORMAT (JSON):
{
  "estimatedAmount": <number or 0 if no expense>,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "suggestedCategory": "<tag key or 'none'>"
}

EXAMPLES:
- "Dinner at Italian restaurant" → {"estimatedAmount": 45, "confidence": 80, "reasoning": "Restaurant dinner typically costs $30-60", "suggestedCategory": "social"}
- "Team meeting about Q4 planning" → {"estimatedAmount": 0, "confidence": 95, "reasoning": "Work meeting with no direct expense", "suggestedCategory": "none"}
- "Buy groceries for the week" → {"estimatedAmount": 75, "confidence": 85, "reasoning": "Weekly groceries for individual/small family", "suggestedCategory": "nutrition"}

YOUR RESPONSE:`;
  }

  private buildInsightsPrompt(summary: any, progress: WeeklyBudgetProgress[]): string {
    const progressSummary = progress.map(p => 
      `${p.config.label}: ${p.spent.toFixed(1)}h/${p.allocated.toFixed(1)}h (${Math.round(p.percentUsed)}%${p.isOverTime ? ' - OVER' : ''})`
    ).join('\n');

    return `You are a helpful financial advisor analyzing someone's weekly budget.

CURRENT WEEK BUDGET STATUS:
Total Budget: $${summary.totalWeeklyBudget}
Total Spent: $${summary.totalWeeklySpent}
Remaining: $${summary.remainingBudget}

CATEGORY BREAKDOWN:
${progressSummary}

TASK:
Generate 2-4 helpful insights about this person's spending patterns. Focus on:
- Categories that are over budget (warnings)
- Suggestions for better balance
- Positive reinforcement for good habits
- Actionable tips for the remaining week

RESPONSE FORMAT (JSON array):
[
  {
    "type": "warning|suggestion|achievement",
    "category": "<category name>",
    "message": "<helpful message>",
    "emoji": "<relevant emoji>"
  }
]

EXAMPLES:
[
  {"type": "warning", "category": "Entertainment", "message": "You've spent 120% of your entertainment budget. Consider free activities for the rest of the week.", "emoji": "⚠️"},
  {"type": "achievement", "category": "Home", "message": "Great job staying within your home budget! You're saving $50 this week.", "emoji": "🏆"},
  {"type": "suggestion", "category": "Overall", "message": "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.", "emoji": "💡"}
]

YOUR RESPONSE:`;
  }

  private parseTimeExtractionResponse(response: string): TimeExtraction | null {
    try {
      // Clean up the response to extract JSON
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      return {
        estimatedTimeHours: parsed.estimatedTimeHours || 0,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning || '',
        suggestedCategory: parsed.suggestedCategory || 'general'
      };
    } catch (error) {
      console.warn('[BudgetService] Failed to parse expense extraction response:', error);
      return null;
    }
  }

  private parseInsightsResponse(response: string): BudgetInsight[] {
    try {
      // Clean up the response to extract JSON
      const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);

      if (Array.isArray(parsed)) {
        return parsed.map(insight => ({
          type: insight.type || 'suggestion',
          category: insight.category || 'General',
          message: insight.message || 'Budget insight',
          emoji: insight.emoji || '💡'
        }));
      }

      return this.generateFallbackTimeInsights();
    } catch (error) {
      console.warn('[BudgetService] Failed to parse insights response:', error);
      return this.generateFallbackTimeInsights();
    }
  }

  private generateFallbackTimeInsights(): BudgetInsight[] {
    const progress = this.budgetStore.budgetProgressByCategory();
    const insights: BudgetInsight[] = [];

    // Check for over-budget categories
    progress.forEach(p => {
      if (p.isOverTime) {
        insights.push({
          type: 'warning',
          category: p.config.label,
          message: `You're over budget by $${Math.abs(p.remaining)} this week`,
          amount: Math.abs(p.remaining),
          emoji: '⚠️'
        });
      } else if (p.percentUsed > 80) {
        insights.push({
          type: 'warning',
          category: p.config.label,
          message: `You've used ${Math.round(p.percentUsed)}% of your ${p.config.label.toLowerCase()} budget`,
          emoji: '📊'
        });
      }
    });

    // Add general suggestion if no specific warnings
    if (insights.length === 0) {
      insights.push({
        type: 'suggestion',
        category: 'General',
        message: 'Your budget looks balanced! Keep tracking expenses to maintain this.',
        emoji: '💚'
      });
    }

    return insights;
  }
}