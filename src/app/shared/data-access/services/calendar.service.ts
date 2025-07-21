import { Injectable } from '@angular/core';
import { Event, EventCard, EventType, CalendarEvent } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  createEventFromCard(card: EventCard, customizations?: Partial<Event>): Event {
    const now = new Date();
    const startDate = customizations?.startDate || card.suggestedStartDate || now;
    
    // Calculate duration and end date
    const durationMinutes = customizations?.durationMinutes || card.suggestedDurationMinutes || 50;
    const endDate = customizations?.endDate || (durationMinutes > 0 ? new Date(startDate.getTime() + durationMinutes * 60 * 1000) : undefined);
    
    return {
      id: customizations?.id || `event_${Date.now()}`,
      title: customizations?.title || card.extractedTitle,
      description: customizations?.description || card.extractedDescription,
      type: customizations?.type || card.suggestedType,
      startDate,
      endDate,
      startTime: customizations?.startTime || card.suggestedTime,
      endTime: customizations?.endTime,
      durationMinutes,
      location: customizations?.location,
      attendees: customizations?.attendees || [],
      isAllDay: customizations?.isAllDay ?? !card.suggestedTime,
      createdAt: customizations?.createdAt || now,
      updatedAt: customizations?.updatedAt || now
    };
  }

  getEventsForDateRange(events: Event[], startDate: Date, endDate: Date): Event[] {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }

  getEventsForDate(events: Event[], date: Date): Event[] {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return this.getEventsForDateRange(events, startOfDay, endOfDay);
  }

  getUpcomingEvents(events: Event[], daysAhead: number = 7): Event[] {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);
    
    return events
      .filter(event => new Date(event.startDate) >= now && new Date(event.startDate) <= futureDate)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  getPastEvents(events: Event[], daysBack: number = 30): Event[] {
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - daysBack);
    
    return events
      .filter(event => new Date(event.startDate) < now && new Date(event.startDate) >= pastDate)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  getEventsByType(events: Event[]): Record<EventType, Event[]> {
    const grouped: Record<EventType, Event[]> = {
      'meeting': [],
      'task': [],
      'reminder': [],
      'appointment': [],
      'deadline': [],
      'personal': [],
      'work': []
    };
    
    events.forEach(event => {
      grouped[event.type].push(event);
    });
    
    return grouped;
  }

  convertToCalendarEvent(event: Event): CalendarEvent {
    const calEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: event.startDate,
      allDay: event.isAllDay,
      extendedProps: {
        description: event.description,
        type: event.type,
        location: event.location,
        attendees: event.attendees
      }
    };
    
    if (event.endDate) {
      calEvent.end = event.endDate;
    }
    
    // Add color coding by event type
    const typeColors = this.getEventTypeColors();
    const colors = typeColors[event.type];
    
    if (colors) {
      calEvent.backgroundColor = colors.bg;
      calEvent.borderColor = colors.border;
      calEvent.textColor = '#FFFFFF';
    }
    
    return calEvent;
  }

  convertToCalendarEvents(events: Event[]): CalendarEvent[] {
    return events.map(event => this.convertToCalendarEvent(event));
  }

  getEventTypeColors(): Record<EventType, { bg: string; border: string }> {
    return {
      'meeting': { bg: '#3B82F6', border: '#1E40AF' },
      'task': { bg: '#10B981', border: '#047857' },
      'reminder': { bg: '#F59E0B', border: '#D97706' },
      'appointment': { bg: '#8B5CF6', border: '#6D28D9' },
      'deadline': { bg: '#EF4444', border: '#DC2626' },
      'personal': { bg: '#06B6D4', border: '#0891B2' },
      'work': { bg: '#6B7280', border: '#374151' }
    };
  }

  getEventTypeIcon(type: EventType): string {
    const icons: Record<EventType, string> = {
      'meeting': '🤝',
      'task': '✅',
      'reminder': '🔔',
      'appointment': '📅',
      'deadline': '⏰',
      'personal': '🏠',
      'work': '💼'
    };
    
    return icons[type] || icons.task;
  }

  // Date utility methods
  formatEventDate(event: Event): string {
    const date = new Date(event.startDate);
    
    if (event.isAllDay) {
      return date.toLocaleDateString();
    }
    
    const dateStr = date.toLocaleDateString();
    const timeStr = event.startTime || date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${dateStr} at ${timeStr}`;
  }

  formatEventDateRange(event: Event): string {
    const startDate = new Date(event.startDate);
    
    if (event.isAllDay) {
      if (event.endDate) {
        const endDate = new Date(event.endDate);
        if (startDate.toDateString() === endDate.toDateString()) {
          return startDate.toLocaleDateString();
        }
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      }
      return startDate.toLocaleDateString();
    }
    
    const startTime = event.startTime || startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (event.endDate && event.endTime) {
      const endDate = new Date(event.endDate);
      if (startDate.toDateString() === endDate.toDateString()) {
        return `${startDate.toLocaleDateString()} ${startTime} - ${event.endTime}`;
      }
      return `${startDate.toLocaleDateString()} ${startTime} - ${endDate.toLocaleDateString()} ${event.endTime}`;
    }
    
    return `${startDate.toLocaleDateString()} at ${startTime}`;
  }

  // Validation methods
  validateEvent(event: Partial<Event>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!event.title?.trim()) {
      errors.push('Event title is required');
    }
    
    if (!event.startDate) {
      errors.push('Event start date is required');
    }
    
    if (event.endDate && event.startDate) {
      if (new Date(event.endDate) < new Date(event.startDate)) {
        errors.push('End date cannot be before start date');
      }
    }
    
    if (event.startTime && event.endTime && !event.endDate) {
      // Same day time validation
      const startTime = this.parseTime(event.startTime);
      const endTime = this.parseTime(event.endTime);
      
      if (startTime && endTime && endTime <= startTime) {
        errors.push('End time must be after start time');
      }
    }
    
    const validTypes: EventType[] = ['meeting', 'task', 'reminder', 'appointment', 'deadline', 'personal', 'work'];
    if (event.type && !validTypes.includes(event.type)) {
      errors.push('Invalid event type');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper methods
  private parseTime(timeString: string): number | null {
    const match = timeString.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3]?.toUpperCase();
    
    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  }

  // Generate smart suggestions for event properties
  suggestEventType(title: string, description?: string): EventType {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    if (text.includes('meeting') || text.includes('call') || text.includes('discuss')) {
      return 'meeting';
    }
    
    if (text.includes('appointment') || text.includes('doctor') || text.includes('dentist')) {
      return 'appointment';
    }
    
    if (text.includes('deadline') || text.includes('due') || text.includes('submit')) {
      return 'deadline';
    }
    
    if (text.includes('remind') || text.includes('remember') || text.includes('don\'t forget')) {
      return 'reminder';
    }
    
    if (text.includes('personal') || text.includes('family') || text.includes('home')) {
      return 'personal';
    }
    
    if (text.includes('work') || text.includes('office') || text.includes('business')) {
      return 'work';
    }
    
    return 'task';
  }

  suggestEventDuration(type: EventType): number {
    // Return duration in minutes - default to 50 minutes (2 pomodoros)
    const durations: Record<EventType, number> = {
      'meeting': 60,
      'task': 50,     // 2 pomodoros
      'reminder': 15,
      'appointment': 30,
      'deadline': 0,
      'personal': 50,  // 2 pomodoros
      'work': 50       // 2 pomodoros
    };
    
    return durations[type] || 50; // Default to 50 minutes (2 pomodoros)
  }
}