import { Injectable, signal, computed, inject } from '@angular/core';
import { Event, EventCard, EventProcessingResult, CalendarEvent, EventType } from '../models/event.model';
import { MainPageState } from '../models/session.model';
import { StorageService } from '../services/storage.service';

interface CalendarSession {
  id: string;
  currentNote: string;
  generatedCards: EventCard[];
  selectedCard: EventCard | null;
  calendarEvents: Event[];
  currentState: MainPageState;
  lastProcessingResult: EventProcessingResult | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarSessionStore {
  private storageService = inject(StorageService);
  
  private sessionSignal = signal<CalendarSession | null>(null);
  
  // Public readonly signals
  readonly session = this.sessionSignal.asReadonly();
  readonly currentNote = computed(() => this.session()?.currentNote || '');
  readonly generatedCards = computed(() => this.session()?.generatedCards || []);
  readonly selectedCard = computed(() => this.session()?.selectedCard || null);
  readonly calendarEvents = computed(() => this.session()?.calendarEvents || []);
  readonly currentState = computed(() => this.session()?.currentState || MainPageState.NOTE_INPUT);
  readonly lastProcessingResult = computed(() => this.session()?.lastProcessingResult || null);
  
  // Computed values
  readonly hasGeneratedCards = computed(() => this.generatedCards().length > 0);
  readonly hasSelectedCard = computed(() => this.selectedCard() !== null);
  readonly isProcessingNote = computed(() => this.currentState() === MainPageState.EVENT_GENERATION);
  readonly canProceedToCalendar = computed(() => this.hasSelectedCard() && this.currentState() === MainPageState.EVENT_SELECTION);
  
  // Calendar display helpers
  readonly calendarEventsList = computed(() => {
    return this.calendarEvents().map(event => this.convertToCalendarEvent(event));
  });
  
  readonly eventsByType = computed(() => {
    const events = this.calendarEvents();
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
  });
  
  // Actions
  startNewSession(): void {
    const now = new Date();
    
    const newSession: CalendarSession = {
      id: `calendar_session_${Date.now()}`,
      currentNote: '',
      generatedCards: [],
      selectedCard: null,
      calendarEvents: this.loadEventsFromStorage(),
      currentState: MainPageState.NOTE_INPUT,
      lastProcessingResult: null,
      createdAt: now,
      updatedAt: now
    };
    
    console.log('[CalendarStore] New calendar session started');
    this.sessionSignal.set(newSession);
  }
  
  setCurrentNote(note: string): void {
    console.log(`[CalendarStore] Note updated: "${note.substring(0, 50)}..."`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      return {
        ...session,
        currentNote: note,
        updatedAt: new Date()
      };
    });
  }
  
  setProcessingResult(result: EventProcessingResult): void {
    console.log(`[CalendarStore] Processing result set: ${result.generatedCards.length} cards generated`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      return {
        ...session,
        generatedCards: result.generatedCards,
        lastProcessingResult: result,
        currentState: MainPageState.EVENT_SELECTION,
        updatedAt: new Date()
      };
    });
  }
  
  selectEventCard(card: EventCard): void {
    console.log(`[CalendarStore] Event card selected: "${card.extractedTitle}"`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      // Mark all cards as unselected, then select the chosen one
      const updatedCards = session.generatedCards.map(c => ({
        ...c,
        isSelected: c.id === card.id
      }));
      
      return {
        ...session,
        generatedCards: updatedCards,
        selectedCard: card,
        updatedAt: new Date()
      };
    });
  }
  
  createEventFromCard(customizations?: Partial<Event>): Event | null {
    const session = this.session();
    const card = session?.selectedCard;
    
    if (!card) {
      console.warn('[CalendarStore] No card selected for event creation');
      return null;
    }
    
    const now = new Date();
    const newEvent: Event = {
      id: `event_${Date.now()}`,
      title: customizations?.title || card.extractedTitle,
      description: customizations?.description || card.extractedDescription,
      type: customizations?.type || card.suggestedType,
      startDate: customizations?.startDate || card.suggestedStartDate || now,
      endDate: customizations?.endDate || card.suggestedEndDate,
      startTime: customizations?.startTime || card.suggestedTime,
      endTime: customizations?.endTime,
      location: customizations?.location,
      attendees: customizations?.attendees,
      isAllDay: customizations?.isAllDay ?? !card.suggestedTime,
      createdAt: now,
      updatedAt: now
    };
    
    console.log(`[CalendarStore] Event created from card: "${newEvent.title}"`);
    return newEvent;
  }
  
  addEventToCalendar(event: Event): void {
    console.log(`[CalendarStore] Adding event to calendar: "${event.title}"`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedEvents = [...session.calendarEvents, event];
      
      // Save to storage
      this.saveEventsToStorage(updatedEvents);
      
      return {
        ...session,
        calendarEvents: updatedEvents,
        currentState: MainPageState.CALENDAR_VIEW,
        updatedAt: new Date()
      };
    });
  }
  
  updateEvent(eventId: string, updates: Partial<Event>): void {
    console.log(`[CalendarStore] Updating event ${eventId}`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedEvents = session.calendarEvents.map(event => 
        event.id === eventId 
          ? { ...event, ...updates, updatedAt: new Date() }
          : event
      );
      
      // Save to storage
      this.saveEventsToStorage(updatedEvents);
      
      return {
        ...session,
        calendarEvents: updatedEvents,
        updatedAt: new Date()
      };
    });
  }
  
  deleteEvent(eventId: string): void {
    console.log(`[CalendarStore] Deleting event ${eventId}`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedEvents = session.calendarEvents.filter(event => event.id !== eventId);
      
      // Save to storage
      this.saveEventsToStorage(updatedEvents);
      
      return {
        ...session,
        calendarEvents: updatedEvents,
        updatedAt: new Date()
      };
    });
  }

  deleteEventCard(cardId: string): void {
    console.log(`[CalendarStore] Deleting event card ${cardId}`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedCards = session.generatedCards.filter(card => card.id !== cardId);
      
      // If the deleted card was selected, clear the selection
      const selectedCard = session.selectedCard?.id === cardId ? null : session.selectedCard;
      
      return {
        ...session,
        generatedCards: updatedCards,
        selectedCard,
        updatedAt: new Date()
      };
    });
  }

  updateEventCardTitle(cardId: string, newTitle: string): void {
    console.log(`[CalendarStore] Updating card title ${cardId}: "${newTitle}"`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedCards = session.generatedCards.map(card => 
        card.id === cardId 
          ? { ...card, extractedTitle: newTitle }
          : card
      );
      
      // Update selected card if it's the one being modified
      const selectedCard = session.selectedCard?.id === cardId 
        ? { ...session.selectedCard, extractedTitle: newTitle }
        : session.selectedCard;
      
      return {
        ...session,
        generatedCards: updatedCards,
        selectedCard,
        updatedAt: new Date()
      };
    });
  }

  updateEventCardDescription(cardId: string, newDescription: string): void {
    console.log(`[CalendarStore] Updating card description ${cardId}: "${newDescription.substring(0, 50)}..."`);
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      const updatedCards = session.generatedCards.map(card => 
        card.id === cardId 
          ? { ...card, extractedDescription: newDescription }
          : card
      );
      
      // Update selected card if it's the one being modified
      const selectedCard = session.selectedCard?.id === cardId 
        ? { ...session.selectedCard, extractedDescription: newDescription }
        : session.selectedCard;
      
      return {
        ...session,
        generatedCards: updatedCards,
        selectedCard,
        updatedAt: new Date()
      };
    });
  }
  
  setCurrentState(state: MainPageState): void {
    this.sessionSignal.update(session => {
      if (!session) return session;
      return {
        ...session,
        currentState: state,
        updatedAt: new Date()
      };
    });
  }
  
  resetForNewNote(): void {
    console.log('[CalendarStore] Resetting for new note input');
    
    this.sessionSignal.update(session => {
      if (!session) return session;
      
      return {
        ...session,
        currentNote: '',
        generatedCards: [],
        selectedCard: null,
        lastProcessingResult: null,
        currentState: MainPageState.NOTE_INPUT,
        updatedAt: new Date()
      };
    });
  }
  
  clearSession(): void {
    console.log('[CalendarStore] Session cleared');
    this.sessionSignal.set(null);
  }
  
  // Helper methods
  getEventById(eventId: string): Event | undefined {
    return this.calendarEvents().find(event => event.id === eventId);
  }
  
  getEventsForDateRange(startDate: Date, endDate: Date): Event[] {
    return this.calendarEvents().filter(event => {
      const eventStart = new Date(event.startDate);
      return eventStart >= startDate && eventStart <= endDate;
    });
  }
  
  private convertToCalendarEvent(event: Event): CalendarEvent {
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
    
    // Color coding by event type
    const typeColors: Record<EventType, { bg: string; border: string }> = {
      'meeting': { bg: '#3B82F6', border: '#1E40AF' },
      'task': { bg: '#10B981', border: '#047857' },
      'reminder': { bg: '#F59E0B', border: '#D97706' },
      'appointment': { bg: '#8B5CF6', border: '#6D28D9' },
      'deadline': { bg: '#EF4444', border: '#DC2626' },
      'personal': { bg: '#06B6D4', border: '#0891B2' },
      'work': { bg: '#6B7280', border: '#374151' }
    };
    
    const colors = typeColors[event.type];
    calEvent.backgroundColor = colors.bg;
    calEvent.borderColor = colors.border;
    calEvent.textColor = '#FFFFFF';
    
    return calEvent;
  }
  
  private loadEventsFromStorage(): Event[] {
    try {
      const stored = this.storageService.getItem('calendar-events');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((event: any) => ({
          ...event,
          startDate: new Date(event.startDate),
          endDate: event.endDate ? new Date(event.endDate) : undefined,
          createdAt: new Date(event.createdAt),
          updatedAt: new Date(event.updatedAt)
        }));
      }
    } catch (error) {
      console.warn('[CalendarStore] Failed to load events from storage:', error);
    }
    
    return [];
  }
  
  private saveEventsToStorage(events: Event[]): void {
    try {
      this.storageService.setItem('calendar-events', JSON.stringify(events));
    } catch (error) {
      console.warn('[CalendarStore] Failed to save events to storage:', error);
    }
  }
}