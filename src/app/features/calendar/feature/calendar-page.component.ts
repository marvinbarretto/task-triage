import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { CalendarSessionStore } from '@shared/data-access/stores/calendar-session.store';
import { CalendarService } from '@shared/data-access/services/calendar.service';
import { Event, EventType } from '@shared/data-access/models/event.model';
import { CalendarDisplayComponent } from '../ui/calendar-display.component';
import { EventDetailsModalComponent } from '../ui/event-details-modal.component';

@Component({
  selector: 'app-calendar-page',
  imports: [CommonModule, ReactiveFormsModule, CalendarDisplayComponent, EventDetailsModalComponent],
  template: `
    <div class="page-content">
      <div class="header">
        <h1>Your Calendar</h1>
        <div class="header-actions">
          <button 
            type="button"
            class="add-note-btn"
            (click)="addNewNote()">
            + Add New Note
          </button>
          
          <div class="view-controls">
            <select [formControl]="viewControl" (change)="onViewChange()">
              <option value="dayGridMonth">Month</option>
              <option value="dayGridWeek">Week</option>
              <option value="dayGrid">Day</option>
            </select>
          </div>
        </div>
      </div>

      @if (calendarEvents().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No events yet</h3>
          <p>Start by adding your first note to create calendar events.</p>
          <button 
            type="button"
            class="primary"
            (click)="addNewNote()">
            Add Your First Note
          </button>
        </div>
      } @else {
        <div class="calendar-section">
          <app-calendar-display
            [events]="calendarEventsList()"
            [view]="currentView"
            (eventClick)="onEventClick($event)"
            (dateClick)="onDateClick($event)">
          </app-calendar-display>
        </div>

        <div class="events-summary">
          <h3>Upcoming Events</h3>
          <div class="upcoming-events">
            @for (event of upcomingEvents; track event.id) {
              <div class="event-item" (click)="onEventClick(event)">
                <div class="event-type-icon">{{getEventTypeIcon(event.type)}}</div>
                <div class="event-info">
                  <div class="event-title">{{event.title}}</div>
                  <div class="event-time">{{formatEventTime(event)}}</div>
                </div>
              </div>
            } @empty {
              <p class="no-upcoming">No upcoming events in the next 7 days</p>
            }
          </div>
        </div>
      }

      @if (selectedEvent) {
        <app-event-details-modal
          [event]="selectedEvent"
          [isOpen]="showEventModal"
          (close)="closeEventModal()"
          (update)="onEventUpdate($event)"
          (delete)="onEventDelete($event)">
        </app-event-details-modal>
      }
    </div>
  `,
  styles: [`
    .page-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header h1 {
      color: #1f2937;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .add-note-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .add-note-btn:hover {
      background: #2563eb;
    }

    .view-controls select {
      padding: 0.5rem 1rem;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      background: white;
      font-size: 0.9rem;
    }

    .view-controls select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #f9fafb;
      border-radius: 12px;
      border: 2px dashed #d1d5db;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    button.primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.875rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    button.primary:hover {
      background: #2563eb;
    }

    .calendar-section {
      margin-bottom: 2rem;
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .events-summary {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .events-summary h3 {
      margin: 0 0 1rem 0;
      color: #1f2937;
    }

    .upcoming-events {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .event-item:hover {
      background: #e2e8f0;
      transform: translateX(4px);
    }

    .event-type-icon {
      font-size: 1.25rem;
      width: 32px;
      text-align: center;
    }

    .event-info {
      flex: 1;
    }

    .event-title {
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }

    .event-time {
      font-size: 0.85rem;
      color: #6b7280;
    }

    .no-upcoming {
      text-align: center;
      color: #9ca3af;
      font-style: italic;
      padding: 2rem;
    }

    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        justify-content: space-between;
      }

      .page-content {
        padding: 1rem;
      }
    }
  `]
})
export class CalendarPageComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private calendarStore = inject(CalendarSessionStore);
  private calendarService = inject(CalendarService);

  // Signals from store
  calendarEvents = this.calendarStore.calendarEvents;
  calendarEventsList = this.calendarStore.calendarEventsList;

  // Form controls
  viewControl = this.fb.control('dayGridMonth');

  // Component state
  selectedEvent: Event | null = null;
  showEventModal = false;
  upcomingEvents: Event[] = [];

  get currentView(): string {
    return this.viewControl.value || 'dayGridMonth';
  }

  ngOnInit(): void {
    // Initialize calendar session if not already done
    const session = this.calendarStore.session();
    if (!session) {
      this.calendarStore.startNewSession();
    }

    // Load upcoming events
    this.loadUpcomingEvents();

    // Update upcoming events when calendar events change
    // In a real app, you might want to use effect() here
    this.calendarEvents().length; // Subscribe to changes
    this.loadUpcomingEvents();
  }

  onViewChange(): void {
    console.log('[Calendar] View changed to:', this.currentView);
  }

  onEventClick(event: Event): void {
    console.log('[Calendar] Event clicked:', event.title);
    this.selectedEvent = event;
    this.showEventModal = true;
  }

  onDateClick(date: Date): void {
    console.log('[Calendar] Date clicked:', date);
    // Could implement quick event creation here
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  onEventUpdate(updatedEvent: Event): void {
    console.log('[Calendar] Event updated:', updatedEvent.title);
    this.calendarStore.updateEvent(updatedEvent.id, updatedEvent);
    this.closeEventModal();
    this.loadUpcomingEvents();
  }

  onEventDelete(event: Event): void {
    console.log('[Calendar] Event deleted:', event.title);
    this.calendarStore.deleteEvent(event.id);
    this.closeEventModal();
    this.loadUpcomingEvents();
  }

  async addNewNote(): Promise<void> {
    console.log('[Calendar] Adding new note');
    this.calendarStore.resetForNewNote();
    await this.router.navigate(['/note-input']);
  }

  getEventTypeIcon(type: EventType): string {
    return this.calendarService.getEventTypeIcon(type);
  }

  formatEventTime(event: Event): string {
    return this.calendarService.formatEventDateRange(event);
  }

  private loadUpcomingEvents(): void {
    this.upcomingEvents = this.calendarService.getUpcomingEvents(this.calendarEvents(), 7);
  }
}