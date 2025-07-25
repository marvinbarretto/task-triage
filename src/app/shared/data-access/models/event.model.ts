export type EventType = 'meeting' | 'task' | 'reminder' | 'appointment' | 'deadline' | 'personal' | 'work';

export type SchedulingFlexibility = 'fixed' | 'morning_flexible' | 'afternoon_flexible' | 'anytime';

export type RepetitionType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RepetitionPattern {
  type: RepetitionType;
  frequency?: number; // e.g., every 2 weeks
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: Date;
  maxOccurrences?: number;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number; // Duration in minutes, defaults to 50 (2 pomodoros)
  location?: string;
  attendees?: string[];
  isAllDay: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventCard {
  id: string;
  originalText: string;
  extractedTitle: string;
  extractedDescription?: string;
  suggestedType: EventType;
  suggestedStartDate?: Date;
  suggestedEndDate?: Date;
  suggestedTime?: string;
  suggestedDurationMinutes?: number; // Suggested duration in minutes
  confidence: number;
  reasoning: string;
  isSelected: boolean;
  
  // Enhanced characteristics
  schedulingFlexibility: SchedulingFlexibility;
  priority: EventPriority;
  isUrgent: boolean;
  templatePotential: boolean;
  templateCategory?: string; // e.g., 'weekly-meeting', 'monthly-review'
  repetitionPattern: RepetitionPattern;
  estimatedPreparationTime?: number; // minutes needed to prepare
  canBeMovedIfNeeded: boolean;
}

export interface EventProcessingResult {
  originalNote: string;
  generatedCards: EventCard[];
  processingSuccess: boolean;
  errorMessage?: string;
  processingTime: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
  allDay?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    description?: string;
    type: EventType;
    location?: string;
    attendees?: string[];
  };
}

// Rule validation system interfaces
export type RuleCategory = 'time' | 'location' | 'workload' | 'breaks' | 'conflicts' | 'duration';

export type RuleSeverity = 'info' | 'warning' | 'error';

export interface RuleCondition {
  type: string;
  parameters: Record<string, any>;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  isEnabled: boolean;
  severity: RuleSeverity;
  condition: RuleCondition;
  message: string;
  suggestionMessage?: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  suggestionMessage?: string;
  affectedEvents: string[];
  eventTitles: string[];
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  violations: RuleViolation[];
  suggestions?: string[];
  validatedAt: Date;
}

export interface RuleConfiguration {
  rules: Rule[];
  lastUpdated: Date;
}