import { Injectable, signal } from '@angular/core';
import { Event, CalendarEvent } from '../models/event.model';

export type AnnouncementSource = 
  | 'drag_drop' 
  | 'form_submit' 
  | 'bulk_import' 
  | 'smart_scheduling' 
  | 'calendar_click' 
  | 'quick_add' 
  | 'template' 
  | 'conflict_resolution';

export type AnnouncementTrigger = 
  | 'user_action' 
  | 'auto_schedule' 
  | 'conflict_avoid' 
  | 'time_preference' 
  | 'optimization' 
  | 'random_placement';

export interface AnnouncementContext {
  source?: AnnouncementSource;
  trigger?: AnnouncementTrigger;
  location?: string; // e.g., 'calendar-cell-9am-monday', 'sidebar-form', 'bulk-import-dialog'
  reason?: string; // Detailed explanation of why this happened
  metadata?: Record<string, any>; // Additional context-specific data
}

export interface CalendarAnnouncement {
  id: string;
  type: 'added' | 'moved' | 'removed' | 'updated' | 'rescheduled';
  message: string;
  timestamp: Date;
  eventTitle?: string;
  details?: string;
  icon?: string;
  
  // Enhanced context fields
  source?: AnnouncementSource;
  trigger?: AnnouncementTrigger;
  location?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarActivityAnnouncerService {
  private announcements = signal<CalendarAnnouncement[]>([]);
  private announcementCounter = 0;

  // Public read-only signal for recent announcements
  readonly recentAnnouncements = this.announcements.asReadonly();

  constructor() {
    console.log('[CalendarActivityAnnouncer] Service initialized');
  }

  /**
   * Announce when an event has been added to the calendar
   */
  announceEventAdded(event: Event, context?: AnnouncementContext): void {
    let message: string;
    let details: string;
    
    // Generate more specific message based on context and timing
    const eventTime = event.startDate;
    const timeDescription = this.getEventTimeDescription(eventTime);
    
    if (context?.source === 'drag_drop') {
      message = `📅 Scheduled "${event.title}" ${timeDescription}`;
      details = context.reason || `Placed at ${eventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (context?.source === 'smart_scheduling') {
      message = `🧠 AI scheduled "${event.title}" ${timeDescription}`;
      details = this.getSmartSchedulingReason(eventTime, context);
    } else if (context?.source === 'quick_add') {
      message = `⚡ Quick-added "${event.title}" ${timeDescription}`;
      details = context.reason || 'Added to next available slot';
    } else if (context?.source === 'form_submit') {
      message = `📝 Created "${event.title}" ${timeDescription}`;
      details = context.reason || 'Manually configured event';
    } else {
      message = `📅 Added "${event.title}" ${timeDescription}`;
      details = context?.reason || '';
    }

    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'added',
      message,
      timestamp: new Date(),
      eventTitle: event.title,
      details,
      icon: '✅',
      source: context?.source,
      trigger: context?.trigger,
      location: context?.location,
      reason: context?.reason,
      metadata: {
        ...context?.metadata,
        eventTime: eventTime.toISOString(),
        duration: event.durationMinutes,
        timeDescription
      }
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Get a friendly description of when an event is scheduled
   */
  private getEventTimeDescription(eventTime: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(eventTime.getFullYear(), eventTime.getMonth(), eventTime.getDate());
    
    const daysDiff = (eventDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
    const timeStr = eventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    if (daysDiff === 0) {
      return `today at ${timeStr}`;
    } else if (daysDiff === 1) {
      return `tomorrow at ${timeStr}`;
    } else if (daysDiff < 7) {
      const dayName = eventTime.toLocaleDateString([], { weekday: 'long' });
      return `${dayName} at ${timeStr}`;
    } else {
      const dateStr = eventTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateStr} at ${timeStr}`;
    }
  }

  /**
   * Generate specific reasoning for smart scheduling decisions
   */
  private getSmartSchedulingReason(eventTime: Date, context?: AnnouncementContext): string {
    const hour = eventTime.getHours();
    let reason = '';
    
    // Add time preference reasoning
    if (hour >= 9 && hour <= 11) {
      reason = 'Placed in optimal morning focus time';
    } else if (hour >= 14 && hour <= 16) {
      reason = 'Scheduled in productive afternoon slot';
    } else if (hour >= 8 && hour <= 18) {
      reason = 'Placed during regular work hours';
    } else {
      reason = 'Scheduled at available time';
    }
    
    // Add context from metadata
    if (context?.metadata?.['isOptimalSlot']) {
      reason += ', first choice time';
    } else {
      reason += ', best available option';
    }
    
    // Add conflict avoidance note
    if (context?.trigger === 'conflict_avoid') {
      reason += ' (avoided existing events)';
    }
    
    return reason;
  }

  /**
   * Legacy method for backward compatibility
   */
  announceEventAddedLegacy(event: Event, method?: string): void {
    const context: AnnouncementContext = {
      source: method === 'drag and drop' ? 'drag_drop' : 
              method === 'form' ? 'form_submit' : 
              undefined,
      trigger: 'user_action',
      reason: method ? `Added via ${method}` : undefined
    };
    
    this.announceEventAdded(event, context);
  }

  /**
   * Announce when an event has been moved to make room for another
   */
  announceEventMoved(event: Event | CalendarEvent, context: AnnouncementContext & { reason: string }, fromTime?: Date, toTime?: Date): void {
    let message: string;
    let details: string;
    
    if (fromTime && toTime) {
      const fromTimeStr = fromTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const toTimeStr = toTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      
      // More specific messaging based on context
      if (context.trigger === 'conflict_avoid') {
        message = `🔄 Moved "${event.title}" from ${fromTimeStr} to ${toTimeStr}`;
        details = this.getMovementReason(fromTime, toTime, context);
      } else if (context.trigger === 'optimization') {
        message = `⚡ Rescheduled "${event.title}" to ${toTimeStr}`;
        details = `From ${fromTimeStr}. ${context.reason}`;
      } else {
        message = `🔄 Moved "${event.title}" (${fromTimeStr} → ${toTimeStr})`;
        details = context.reason;
      }
    } else {
      message = `🔄 Moved "${event.title}"`;
      details = context.reason;
    }

    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'moved',
      message,
      timestamp: new Date(),
      eventTitle: event.title,
      details,
      icon: '🔄',
      source: context.source,
      trigger: context.trigger,
      location: context.location,
      reason: context.reason,
      metadata: {
        ...context.metadata,
        fromTime: fromTime?.toISOString(),
        toTime: toTime?.toISOString(),
        timeDifference: fromTime && toTime ? toTime.getTime() - fromTime.getTime() : undefined
      }
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Generate a more descriptive reason for why an event was moved
   */
  private getMovementReason(fromTime: Date, toTime: Date, context: AnnouncementContext): string {
    const timeDiff = toTime.getTime() - fromTime.getTime();
    const minutes = Math.abs(timeDiff / (1000 * 60));
    const direction = timeDiff > 0 ? 'later' : 'earlier';
    
    let reason = context.reason || 'to avoid scheduling conflicts';
    
    // Add time context
    if (minutes < 60) {
      reason += ` (${Math.round(minutes)} minutes ${direction})`;
    } else if (minutes < 24 * 60) {
      const hours = Math.round(minutes / 60);
      reason += ` (${hours} hour${hours > 1 ? 's' : ''} ${direction})`;
    } else {
      const days = Math.round(minutes / (24 * 60));
      reason += ` (${days} day${days > 1 ? 's' : ''} ${direction})`;
    }
    
    // Add benefit context based on metadata
    if (context.metadata?.['batchSize']) {
      reason += ` to accommodate ${context.metadata['batchSize']} new events`;
    }
    
    return reason;
  }

  /**
   * Legacy method for backward compatibility
   */
  announceEventMovedLegacy(event: Event | CalendarEvent, reason: string, fromTime?: Date, toTime?: Date): void {
    const context: AnnouncementContext & { reason: string } = {
      source: 'conflict_resolution',
      trigger: 'auto_schedule',
      reason
    };
    
    this.announceEventMoved(event, context, fromTime, toTime);
  }

  /**
   * Announce when events have been rescheduled to accommodate a new event
   */
  announceEventsRescheduled(movedEvents: (Event | CalendarEvent)[], newEvent: Event): void {
    const eventCount = movedEvents.length;
    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'rescheduled',
      message: `⚡ Rescheduled ${eventCount} event${eventCount === 1 ? '' : 's'} to fit "${newEvent.title}"`,
      timestamp: new Date(),
      eventTitle: newEvent.title,
      details: `Moved: ${movedEvents.map(e => e.title).join(', ')}`,
      icon: '⚡'
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Announce when multiple events have been added in batch
   */
  announceBatchEventsAdded(events: Event[], context: AnnouncementContext): void {
    const eventNames = events.map(e => e.title);
    const displayedNames = eventNames.slice(0, 3);
    const remainingCount = eventNames.length - 3;
    
    // Create a more specific message based on context
    let message: string;
    let details: string;
    
    if (context.source === 'smart_scheduling') {
      const timeContext = this.getTimeContextForEvents(events);
      message = `🧠 AI scheduled ${displayedNames.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`;
      details = `${timeContext}. ${context.reason || 'Optimized for your schedule and preferences'}`;
    } else if (context.source === 'bulk_import') {
      message = `📥 Imported ${displayedNames.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`;
      details = `From ${context.reason || 'import file'}`;
    } else {
      message = `🎯 Added ${displayedNames.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`;
      details = context.reason || `Batch creation of ${events.length} events`;
    }

    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'added',
      message,
      timestamp: new Date(),
      details,
      icon: context.source === 'smart_scheduling' ? '🧠' : '🎯',
      source: context.source,
      trigger: context.trigger,
      location: context.location,
      reason: context.reason,
      metadata: { 
        ...context.metadata, 
        eventCount: events.length, 
        eventTitles: eventNames,
        displayedNames,
        hiddenCount: remainingCount
      }
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Generate time context description for a set of events
   */
  private getTimeContextForEvents(events: Event[]): string {
    if (events.length === 0) return '';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    let todayCount = 0;
    let tomorrowCount = 0;
    let futureCount = 0;
    let morningCount = 0;
    let afternoonCount = 0;
    
    events.forEach(event => {
      const eventDate = new Date(event.startDate);
      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      if (eventDay.getTime() === today.getTime()) {
        todayCount++;
      } else if (eventDay.getTime() === tomorrow.getTime()) {
        tomorrowCount++;
      } else {
        futureCount++;
      }
      
      const hour = eventDate.getHours();
      if (hour < 12) {
        morningCount++;
      } else {
        afternoonCount++;
      }
    });
    
    const timeParts: string[] = [];
    
    if (todayCount > 0) timeParts.push(`${todayCount} for today`);
    if (tomorrowCount > 0) timeParts.push(`${tomorrowCount} for tomorrow`);
    if (futureCount > 0) timeParts.push(`${futureCount} for later`);
    
    const dayContext = timeParts.join(', ');
    
    const timeOfDayParts: string[] = [];
    if (morningCount > 0) timeOfDayParts.push(`${morningCount} morning`);
    if (afternoonCount > 0) timeOfDayParts.push(`${afternoonCount} afternoon`);
    
    const timeOfDayContext = timeOfDayParts.join(', ');
    
    return `${dayContext}${timeOfDayContext ? ` (${timeOfDayContext})` : ''}`;
  }

  /**
   * Legacy method for backward compatibility
   */
  announceBatchEventsAddedLegacy(events: Event[], source: string): void {
    const context: AnnouncementContext = {
      source: source === 'import' ? 'bulk_import' : 'bulk_import',
      trigger: 'user_action',
      reason: source
    };
    
    this.announceBatchEventsAdded(events, context);
  }

  /**
   * Announce when an event has been removed
   */
  announceEventRemoved(event: Event | CalendarEvent, reason?: string): void {
    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'removed',
      message: `🗑️ Removed "${event.title}" from calendar`,
      timestamp: new Date(),
      eventTitle: event.title,
      details: reason,
      icon: '🗑️'
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Announce smart scheduling decisions
   */
  announceSmartScheduling(message: string, details?: string): void {
    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'updated',
      message: `🧠 ${message}`,
      timestamp: new Date(),
      details,
      icon: '🧠'
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Get the most recent announcements
   */
  getRecentAnnouncements(limit: number = 5): CalendarAnnouncement[] {
    return this.announcements().slice(-limit).reverse(); // Most recent first
  }

  /**
   * Clear all announcements
   */
  clearAnnouncements(): void {
    this.announcements.set([]);
    console.log('[CalendarActivityAnnouncer] All announcements cleared');
  }

  /**
   * Get a summary of recent activity
   */
  getRecentActivitySummary(): string {
    const recent = this.getRecentAnnouncements(3);
    if (recent.length === 0) return 'No recent activity';
    
    return recent.map(a => a.message.replace(/^[📅🔄⚡🎯🗑️🧠]\s/, '')).join(' • ');
  }

  private addAnnouncement(announcement: CalendarAnnouncement): void {
    const currentAnnouncements = this.announcements();
    const maxAnnouncements = 20; // Keep only last 20 announcements
    
    const newAnnouncements = [...currentAnnouncements, announcement];
    
    // Trim to max announcements if needed
    if (newAnnouncements.length > maxAnnouncements) {
      newAnnouncements.splice(0, newAnnouncements.length - maxAnnouncements);
    }
    
    this.announcements.set(newAnnouncements);
    console.log('[CalendarActivityAnnouncer]', announcement.message);
  }
}