export type EventType = 'meeting' | 'task' | 'reminder' | 'appointment' | 'deadline' | 'personal' | 'work';

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