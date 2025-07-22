import { Injectable, signal } from '@angular/core';
import { Event, CalendarEvent } from '../models/event.model';

export interface CalendarAnnouncement {
  id: string;
  type: 'added' | 'moved' | 'removed' | 'updated' | 'rescheduled';
  message: string;
  timestamp: Date;
  eventTitle?: string;
  details?: string;
  icon?: string;
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
  announceEventAdded(event: Event, method?: string): void {
    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'added',
      message: `📅 Added "${event.title}" to your calendar`,
      timestamp: new Date(),
      eventTitle: event.title,
      details: method ? `Added via ${method}` : undefined,
      icon: '✅'
    };

    this.addAnnouncement(announcement);
  }

  /**
   * Announce when an event has been moved to make room for another
   */
  announceEventMoved(event: Event | CalendarEvent, reason: string, fromTime?: Date, toTime?: Date): void {
    let message = `🔄 Moved "${event.title}"`;
    
    if (fromTime && toTime) {
      const fromTimeStr = fromTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const toTimeStr = toTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      message += ` (${fromTimeStr} → ${toTimeStr})`;
    }

    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'moved',
      message,
      timestamp: new Date(),
      eventTitle: event.title,
      details: reason,
      icon: '🔄'
    };

    this.addAnnouncement(announcement);
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
  announceBatchEventsAdded(events: Event[], source: string): void {
    const announcement: CalendarAnnouncement = {
      id: `announcement_${++this.announcementCounter}`,
      type: 'added',
      message: `🎯 Added ${events.length} events from ${source}`,
      timestamp: new Date(),
      details: `Events: ${events.map(e => e.title).join(', ')}`,
      icon: '🎯'
    };

    this.addAnnouncement(announcement);
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