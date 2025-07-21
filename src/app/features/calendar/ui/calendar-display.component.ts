import { Component, Input, Output, EventEmitter, ViewChild, AfterViewInit, OnChanges, OnDestroy } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg, Draggable } from '@fullcalendar/interaction';
import { CalendarEvent, Event, EventCard } from '@shared/data-access/models/event.model';

@Component({
  selector: 'app-calendar-display',
  imports: [FullCalendarModule],
  template: `
    <div class="calendar-wrapper">
      <full-calendar
        #calendar
        [options]="calendarOptions">
      </full-calendar>
    </div>
  `,
  styles: [`
    .calendar-wrapper {
      min-height: 600px;
      padding: 1rem;
    }

    :host ::ng-deep .fc {
      height: 100%;
    }

    :host ::ng-deep .fc-toolbar {
      margin-bottom: 1rem;
    }

    :host ::ng-deep .fc-toolbar-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    :host ::ng-deep .fc-button {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
      font-weight: 500;
    }

    :host ::ng-deep .fc-button:hover {
      background: #2563eb;
      border-color: #2563eb;
    }

    :host ::ng-deep .fc-button:focus {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
    }

    :host ::ng-deep .fc-event {
      border-radius: 4px;
      border: none;
      font-weight: 500;
      font-size: 0.85rem;
      cursor: pointer;
    }

    :host ::ng-deep .fc-event:hover {
      filter: brightness(0.9);
    }

    :host ::ng-deep .fc-daygrid-day {
      cursor: pointer;
    }

    :host ::ng-deep .fc-daygrid-day:hover {
      background-color: #f8fafc;
    }

    :host ::ng-deep .fc-day-today {
      background-color: #eff6ff !important;
    }

    :host ::ng-deep .fc-col-header-cell {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }

    :host ::ng-deep .fc-scrollgrid {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    /* Drag and drop visual feedback */
    :host ::ng-deep .fc-timegrid-slot {
      transition: background-color 0.2s ease;
    }

    :host ::ng-deep .fc-timegrid-slot:hover {
      background-color: #f0f9ff !important;
    }

    :host ::ng-deep .fc-day:hover {
      background-color: #f8fafc !important;
    }

    /* Highlight drop zones during drag */
    :host ::ng-deep .fc-highlight {
      background-color: #dbeafe !important;
      border: 2px dashed #3b82f6 !important;
    }

    /* Style for when dragging over calendar */
    :host ::ng-deep .fc-day.fc-day-dragging {
      background-color: #eff6ff !important;
      border: 2px solid #3b82f6 !important;
    }

    :host ::ng-deep .fc-timegrid-slot.fc-slot-dragging {
      background-color: #dbeafe !important;
      border-left: 3px solid #3b82f6 !important;
    }
    
    /* Enhanced drag feedback when external drag is active */
    :host ::ng-deep .fc.external-drag-active .fc-timegrid-slot {
      border-top: 1px solid #e5e7eb;
      transition: all 0.15s ease;
      position: relative;
    }
    
    :host ::ng-deep .fc.external-drag-active .fc-timegrid-slot:hover {
      background-color: #dbeafe !important;
      border-top: 2px solid #3b82f6 !important;
      box-shadow: inset 0 0 8px rgba(59, 130, 246, 0.2);
    }
    
    /* Show time slot preview during hover */
    :host ::ng-deep .fc.external-drag-active .fc-timegrid-slot:hover::after {
      content: 'Drop here';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      pointer-events: none;
      z-index: 10;
    }
    
    /* Style for dragged element */
    :host ::ng-deep .fc-event-dragging {
      opacity: 0.7 !important;
      transform: scale(0.95) !important;
      z-index: 999 !important;
    }
    
    /* Better drop zone highlighting for all-day area */
    :host ::ng-deep .fc.external-drag-active .fc-day:hover {
      background-color: #f0f9ff !important;
      border: 2px dashed #3b82f6 !important;
    }
    
    /* Add visual feedback for valid drop zones */
    :host ::ng-deep .fc.external-drag-active .fc-scrollgrid {
      border: 2px solid #3b82f6;
      border-radius: 8px;
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
    }
    
    /* Animate calendar during external drag */
    :host ::ng-deep .fc.external-drag-active {
      transform: scale(1.02);
      transition: transform 0.2s ease;
    }
  `]
})
export class CalendarDisplayComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('calendar') calendarComponent!: any;

  @Input() events: CalendarEvent[] = [];
  @Input() view: string = 'dayGridMonth';
  @Input() currentDraggedCard: EventCard | null = null;

  @Output() eventClick = new EventEmitter<Event>();
  @Output() dateClick = new EventEmitter<Date>();
  @Output() eventDrop = new EventEmitter<{cardId: string, date: Date, allDay?: boolean, durationMinutes?: number}>();

  // Debouncing for performance and current drag context
  private dragOverTimeout?: number;
  private dragEnterTimeout?: number;
  private lastDragOverLog = 0;
  private lastDragEnterLog = 0;
  private readonly DRAG_LOG_THROTTLE = 500; // Log every 500ms max
  private currentDragEventName = '';
  private lastHoveredTimeSlot = '';
  private draggableInstances: any[] = []; // Keep track of Draggable instances
  
  // Prevent duplicate drops
  private lastDropTime = 0;
  private lastDropCardId = '';
  private readonly DROP_DEBOUNCE_MS = 1000; // Prevent duplicate drops within 1 second
  
  // Optimize dropAccept performance
  private lastDropAcceptCheck = 0;
  private lastDropAcceptElement: HTMLElement | null = null;
  private readonly DROP_ACCEPT_THROTTLE = 100; // Check every 100ms max
  
  // DOM observation for dynamic card detection
  private cardMutationObserver?: MutationObserver;
  private isObservingCards = false;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridWeek'
    },
    editable: true,
    droppable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: 3,
    weekends: true,
    events: [],
    
    // Event interaction callbacks with comprehensive logging
    eventClick: (arg: EventClickArg) => this.onEventClick(arg),
    dateClick: (arg: DateClickArg) => this.onDateClick(arg),
    
    // External drag & drop callbacks - use eventReceive for external drags
    eventReceive: (info: any) => {
      console.log('📥🔥 [CalendarDisplay] FULLCALENDAR EVENT RECEIVE CALLBACK FIRED!');
      this.onEventReceive(info);
    },
    
    // Keep drop callback for debugging but don't create events
    drop: (info: any) => {
      console.log('🎯 [CalendarDisplay] Drop detected (debug only)');
      this.onDropDebug(info);
    },
    
    // Drag feedback callbacks
    eventDragStart: (info: any) => this.onEventDragStart(info),
    eventDragStop: (info: any) => this.onEventDragStop(info),
    eventDrop: (info: any) => this.onEventDrop(info),
    
    // Selection callbacks for debugging
    select: (info: any) => this.onSelect(info),
    unselect: (info: any) => this.onUnselect(info),
    
    // Display settings
    eventDisplay: 'block',
    displayEventTime: true,
    displayEventEnd: false,
    height: 'auto',
    contentHeight: 'auto',
    aspectRatio: undefined, // Let calendar determine its own height
    
    // Drop acceptance configuration with throttling
    dropAccept: (draggable: HTMLElement) => {
      const now = Date.now();
      
      // Throttle the logging and expensive checks
      if (this.lastDropAcceptElement === draggable && 
          (now - this.lastDropAcceptCheck) < this.DROP_ACCEPT_THROTTLE) {
        // Same element checked recently, return cached result
        return draggable.classList.contains('event-card');
      }
      
      // Update throttling tracking
      this.lastDropAcceptCheck = now;
      this.lastDropAcceptElement = draggable;
      
      const isEventCard = draggable.classList.contains('event-card');
      console.log(`[Calendar] 🔍 dropAccept: ${isEventCard ? '✅' : '❌'} for "${draggable.getAttribute('data-event-title') || 'Unknown'}"`);
      
      return isEventCard;
    },
    
    // Additional drag settings to ensure compatibility
    longPressDelay: 300,
    eventLongPressDelay: 300,
    selectLongPressDelay: 300
  };

  ngAfterViewInit(): void {
    console.log('[CalendarDisplay] Component initialized, updating calendar');
    this.updateCalendar();
    
    // Add global drag event listeners for debugging
    this.addGlobalDragListeners();
    
    // Start observing for event cards in the DOM
    this.startObservingEventCards();
    
    // Initialize external draggable elements with retry logic
    this.initializeExternalDraggablesWithRetry();
  }
  
  ngOnDestroy(): void {
    // Clean up mutation observer
    this.stopObservingEventCards();
    
    // Clean up draggable instances
    this.draggableInstances.forEach(instance => {
      try {
        instance.destroy();
      } catch (error) {
        console.warn('[Calendar] Error destroying draggable instance on cleanup:', error);
      }
    });
    this.draggableInstances = [];
  }

  ngOnChanges(): void {
    console.log('[Calendar] ngOnChanges triggered - updating calendar and re-initializing draggables');
    this.updateCalendar();
    
    // Re-initialize draggables when inputs change (new cards generated)
    // Use a small delay to allow DOM updates then check for cards
    setTimeout(() => {
      const cardCount = document.querySelectorAll('.event-card').length;
      if (cardCount > 0) {
        console.log(`[Calendar] Cards available (${cardCount}), initializing draggables`);
        this.initializeExternalDraggablesWithRetry();
      } else {
        console.log('[Calendar] No cards available yet, skipping draggable initialization');
      }
    }, 100);
  }

  private updateCalendar(): void {
    console.log('[CalendarDisplay] Updating calendar with', this.events.length, 'events');
    
    if (this.calendarComponent) {
      const calendarApi = this.calendarComponent.getApi();
      
      // Update view if changed
      if (calendarApi.view.type !== this.view) {
        console.log('[CalendarDisplay] Changing view from', calendarApi.view.type, 'to', this.view);
        calendarApi.changeView(this.view);
      }
      
      // Clear existing events and add new ones
      calendarApi.removeAllEvents();
      calendarApi.addEventSource(this.events);
      
      console.log('[CalendarDisplay] Calendar updated with events:', this.events);
    } else {
      console.warn('[CalendarDisplay] Calendar component not available yet');
    }
  }

  private onEventClick(arg: EventClickArg): void {
    console.log('[CalendarDisplay] Event clicked:', arg.event.title);
    
    // Convert FullCalendar event back to our Event model
    const calendarEvent = this.events.find(e => e.id === arg.event.id);
    if (calendarEvent && calendarEvent.extendedProps) {
      const event: Event = {
        id: calendarEvent.id,
        title: calendarEvent.title,
        description: calendarEvent.extendedProps['description'],
        type: calendarEvent.extendedProps['type'],
        startDate: new Date(calendarEvent.start!),
        endDate: calendarEvent.end ? new Date(calendarEvent.end) : undefined,
        isAllDay: calendarEvent.allDay || false,
        location: calendarEvent.extendedProps['location'],
        attendees: calendarEvent.extendedProps['attendees'] || [],
        createdAt: new Date(), // We don't have this from FullCalendar
        updatedAt: new Date()  // We don't have this from FullCalendar
      };
      
      this.eventClick.emit(event);
    }
  }

  private onDateClick(arg: DateClickArg): void {
    console.log('[CalendarDisplay] Date clicked:', arg.dateStr);
    this.dateClick.emit(arg.date);
  }


  // Public methods for external control
  public goToDate(date: Date): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().gotoDate(date);
    }
  }

  public changeView(view: string): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().changeView(view);
    }
  }

  public next(): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().next();
    }
  }

  public prev(): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().prev();
    }
  }

  public today(): void {
    if (this.calendarComponent) {
      this.calendarComponent.getApi().today();
    }
  }

  public reinitializeDraggables(): void {
    console.log('[Calendar] Manually reinitializing draggables');
    this.initializeExternalDraggablesWithRetry();
  }
  
  private initializeExternalDraggablesWithRetry(attempt: number = 1, maxAttempts: number = 8): void {
    // Check if calendar is ready
    if (!this.isCalendarReady()) {
      if (attempt < maxAttempts) {
        const delay = attempt * 200;
        setTimeout(() => {
          this.initializeExternalDraggablesWithRetry(attempt + 1, maxAttempts);
        }, delay);
      } else {
        console.error('❌ [Calendar] Failed to initialize draggables');
      }
      return;
    }
    
    // Check if event cards are available in DOM
    const cardCount = document.querySelectorAll('.event-card').length;
    if (cardCount === 0) {
      if (attempt < maxAttempts) {
        const delay = Math.min(attempt * 150, 800);
        setTimeout(() => {
          this.initializeExternalDraggablesWithRetry(attempt + 1, maxAttempts);
        }, delay);
      }
      return;
    }
    
    // Both calendar and cards are ready, proceed with initialization
    console.log(`🎯 [Calendar] Initializing ${cardCount} draggable cards`);
    this.initializeExternalDraggables();
  }
  
  private isCalendarReady(): boolean {
    const calendarApi = this.calendarComponent?.getApi();
    const hasCalendarApi = !!calendarApi;
    const hasCalendarElement = !!calendarApi?.el;
    const isViewRendered = !!calendarApi?.view;
    
    return hasCalendarApi && hasCalendarElement && isViewRendered;
  }
  
  private startObservingEventCards(): void {
    if (this.isObservingCards) {
      return;
    }
    
    this.isObservingCards = true;
    
    // Find the events section container
    const eventsSection = document.querySelector('.events-section');
    if (!eventsSection) {
      console.warn('[Calendar] Events section not found, cannot observe for cards');
      return;
    }
    
    // Create mutation observer to watch for new event cards
    this.cardMutationObserver = new MutationObserver((mutations) => {
      let cardAdded = false;
      
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // Check if this node or any of its children are event cards
            if (element.classList?.contains('event-card') || 
                element.querySelector?.('.event-card')) {
              cardAdded = true;
            }
          }
        });
      });
      
      if (cardAdded) {
        console.log('[Calendar] 🔄 Event cards detected in DOM via MutationObserver, initializing draggables');
        // Small delay to ensure DOM is fully updated
        setTimeout(() => {
          this.initializeExternalDraggablesWithRetry();
        }, 50);
      }
    });
    
    // Start observing
    this.cardMutationObserver.observe(eventsSection, {
      childList: true,
      subtree: true
    });
  }
  
  private stopObservingEventCards(): void {
    if (this.cardMutationObserver) {
      console.log('[Calendar] Stopping event card observation');
      this.cardMutationObserver.disconnect();
      this.cardMutationObserver = undefined;
    }
    this.isObservingCards = false;
  }
  
  // Main event creation method - handles external drags
  private onEventReceive(info: any): void {
    console.log('📥 [Calendar] External drag received');
    
    // Extract event data from the received FullCalendar event
    const fcEvent = info.event;
    const draggedEl = info.draggedEl;
    
    // Get card ID and other data from the dragged element
    const cardId = draggedEl?.getAttribute('data-card-id') || 
                   draggedEl?.getAttribute('data-event-id');
    
    if (!cardId) {
      console.error('❌ [Calendar] No card ID found');
      return;
    }
    
    // DUPLICATE PREVENTION: Check if this is a duplicate drop
    const now = Date.now();
    if (cardId === this.lastDropCardId && (now - this.lastDropTime) < this.DROP_DEBOUNCE_MS) {
      console.log(`⏭️ [Calendar] Duplicate prevented (${now - this.lastDropTime}ms ago)`);
      fcEvent.remove(); // Remove the duplicate event from calendar
      return;
    }
    
    // Update drop tracking
    this.lastDropTime = now;
    this.lastDropCardId = cardId;
    
    // Extract event details
    const dropDate = fcEvent.start;
    const eventTitle = fcEvent.title || this.currentDraggedCard?.extractedTitle || 'Unknown Event';
    const durationMinutes = fcEvent.extendedProps?.originalDuration || 50;
    
    const hours = dropDate?.getHours() || 0;
    const minutes = dropDate?.getMinutes() || 0;
    const timeSlot = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    console.log(`✅ [Calendar] Creating "${eventTitle}" at ${timeSlot} (${durationMinutes}min)`);
    
    // Create drop event data for parent component
    const dropEventData = {
      cardId,
      date: dropDate,
      allDay: fcEvent.allDay || false,
      durationMinutes,
      dropContext: {
        timestamp: new Date().toISOString(),
        calendarView: info.view?.type,
        timeSlot,
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dropDate?.getDay() || 0]
      }
    };
    
    // Emit to parent component for event creation
    this.eventDrop.emit(dropEventData);
  }
  
  // Debug-only drop callback
  private onDropDebug(info: any): void {
    const dropDate = info.date;
    const hours = dropDate?.getHours() || 0;
    const minutes = dropDate?.getMinutes() || 0;
    const timeSlot = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    let cardTitle = 'Unknown Event';
    if (info.draggedEl) {
      const titleFromEl = info.draggedEl.getAttribute('data-event-title');
      if (titleFromEl) {
        cardTitle = titleFromEl;
      }
    }
    
    console.log(`[CalendarDisplay] 🔍 Drop debug: "${cardTitle}" at ${timeSlot}`);
  }
  
  private onEventDragStart(info: any): void {
    console.log('🏃 [CalendarDisplay] Event drag started:', info);
  }
  
  private onEventDragStop(info: any): void {
    console.log('🛑 [CalendarDisplay] Event drag stopped:', info);
  }
  
  private onEventDrop(info: any): void {
    console.log('📍 [CalendarDisplay] Existing event dropped (moved):', info);
  }
  
  private onSelect(info: any): void {
    console.log('🔍 [CalendarDisplay] Selection made:', info);
  }
  
  private onUnselect(info: any): void {
    console.log('❌ [CalendarDisplay] Selection cleared:', info);
  }
  
  private addGlobalDragListeners(): void {
    console.log('[Calendar] Adding drag event listeners');
    
    // Add listeners to the calendar wrapper to detect drag events
    const calendarWrapper = document.querySelector('.calendar-wrapper');
    if (calendarWrapper) {
      // Throttled dragover with time slot detection
      calendarWrapper.addEventListener('dragover', (e) => {
        e.preventDefault(); // Required for drop to work
        
        const now = Date.now();
        if (now - this.lastDragOverLog > this.DRAG_LOG_THROTTLE) {
          // Try to detect what time slot we're hovering over
          const target = e.target as HTMLElement;
          const timeSlot = this.getTimeSlotFromElement(target);
          
          if (timeSlot !== this.lastHoveredTimeSlot) {
            const eventName = this.currentDragEventName || this.currentDraggedCard?.extractedTitle || 'Unknown Event';
            console.log(`[Calendar] (throttled) Hovering over ${timeSlot} for \`${eventName}\``);
            this.lastHoveredTimeSlot = timeSlot;
          }
          
          this.lastDragOverLog = now;
        }
      });
      
      // Throttled dragenter logging  
      calendarWrapper.addEventListener('dragenter', (e) => {
        const now = Date.now();
        if (now - this.lastDragEnterLog > this.DRAG_LOG_THROTTLE) {
          const eventName = this.currentDragEventName || this.currentDraggedCard?.extractedTitle || 'Unknown Event';
          console.log(`[Calendar] Dragover detected for \`${eventName}\``);
          this.lastDragEnterLog = now;
        }
      });
      
      // Keep dragleave - it's less frequent and useful for debugging
      calendarWrapper.addEventListener('dragleave', (e) => {
        const dragEvent = e as DragEvent;
        if (dragEvent.relatedTarget && !calendarWrapper.contains(dragEvent.relatedTarget as Node)) {
          const eventName = this.currentDragEventName || this.currentDraggedCard?.extractedTitle || 'Unknown Event';
          console.log(`[Calendar] Drag left calendar for \`${eventName}\``);
          this.currentDragEventName = ''; // Reset
          this.lastHoveredTimeSlot = '';
        }
      });
      
      // Keep drop logging - this is an important discrete event
      calendarWrapper.addEventListener('drop', (e) => {
        console.log('[Calendar] Native drop event on wrapper');
      });
    } else {
      console.warn('[Calendar] Could not find calendar wrapper for drag listeners');
    }
  }
  
  private getTimeSlotFromElement(element: HTMLElement): string {
    // Try to find the time slot from various FullCalendar classes
    let currentEl: HTMLElement | null = element;
    
    while (currentEl) {
      // Look for time slot indicators
      if (currentEl.classList.contains('fc-timegrid-slot')) {
        const timeAttr = currentEl.getAttribute('data-time');
        if (timeAttr) {
          return timeAttr;
        }
      }
      
      // Look for time label
      const timeLabel = currentEl.querySelector('.fc-timegrid-slot-label-cushion');
      if (timeLabel && timeLabel.textContent) {
        return timeLabel.textContent.trim();
      }
      
      currentEl = currentEl.parentElement;
    }
    
    // Fallback: try to extract time from mouse position or context
    return 'Unknown Time';
  }
  
  private initializeExternalDraggables(): void {
    console.log('[Calendar] Initializing external draggable elements...');
    
    // Clean up existing draggable instances first
    this.draggableInstances.forEach(instance => {
      try {
        instance.destroy();
      } catch (error) {
        console.warn('[Calendar] Error destroying draggable instance:', error);
      }
    });
    this.draggableInstances = [];
    
    // Find all event cards
    const eventCards = document.querySelectorAll('.event-card');
    console.log(`[Calendar] Found ${eventCards.length} event cards to make draggable`);
    
    if (eventCards.length === 0) {
      console.warn('[Calendar] No event cards found - they may not be rendered yet');
      return;
    }
    
    // Get calendar instance - this is crucial for proper integration
    const calendarApi = this.calendarComponent?.getApi();
    if (!calendarApi) {
      console.warn('[Calendar] Calendar API not available yet');
      return;
    }

    console.log(`[Calendar] Calendar API available: ${calendarApi.view?.type} view`);
    console.log('[Calendar] Calendar element:', calendarApi.el);
    
    // CRITICAL: Create a shared container for all draggables
    const allEventCardsContainer = document.querySelector('.events-section') || document.body;
    console.log('[Calendar] Using container for draggables:', allEventCardsContainer);
    
    // Initialize the container as a draggable area that targets our calendar
    try {
      const containerDraggable = new Draggable(allEventCardsContainer as HTMLElement, {
        itemSelector: '.event-card',
        eventData: (eventEl: HTMLElement) => {
          const cardId = eventEl.getAttribute('data-card-id');
          const cardTitle = eventEl.getAttribute('data-event-title') || eventEl.textContent?.trim() || 'Unknown Event';
          const cardDuration = eventEl.getAttribute('data-event-duration') || eventEl.getAttribute('data-duration') || '50';
          
          console.log(`[Calendar] 🎯 CONTAINER DRAGGABLE - Creating event data for: ${cardTitle}`);
          const eventData = {
            id: `external-${cardId}-${Date.now()}`,
            title: cardTitle,
            duration: `00:${cardDuration}:00`, // HH:MM:SS format for FullCalendar
            extendedProps: {
              cardId: cardId,
              originalDuration: parseInt(cardDuration, 10),
              sourceType: 'external-card'
            },
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            textColor: 'white'
          };
          console.log('[Calendar] Container draggable event data created:', eventData);
          return eventData;
        }
      });
      
      this.draggableInstances.push(containerDraggable);
      console.log('[Calendar] ✅ Created container-based draggable');
      
    } catch (error) {
      console.error('[Calendar] ❌ Error creating container draggable:', error);
    }
    
    // Also initialize each card individually as fallback
    eventCards.forEach((cardEl, index) => {
      const cardId = cardEl.getAttribute('data-card-id');
      const cardTitle = cardEl.getAttribute('data-event-title') || cardEl.textContent?.trim() || `Card ${index + 1}`;
      const cardDuration = cardEl.getAttribute('data-event-duration') || cardEl.getAttribute('data-duration') || '50';
      
      try {
        console.log(`[Calendar] Creating individual draggable for: ${cardTitle}`);
        
        const draggableInstance = new Draggable(cardEl as HTMLElement, {
          eventData: () => {
            console.log(`[Calendar] 🎯 INDIVIDUAL DRAGGABLE - Creating event data for: ${cardTitle}`);
            const eventData = {
              id: `external-${cardId}-${Date.now()}`,
              title: cardTitle,
              duration: `00:${cardDuration}:00`, // HH:MM:SS format for FullCalendar
              extendedProps: {
                cardId: cardId,
                originalDuration: parseInt(cardDuration, 10),
                sourceType: 'external-card'
              },
              backgroundColor: '#3b82f6',
              borderColor: '#2563eb',
              textColor: 'white'
            };
            console.log('[Calendar] Individual draggable event data created:', eventData);
            return eventData;
          }
        });
        
        // Store the instance for cleanup
        this.draggableInstances.push(draggableInstance);
        
        console.log(`[Calendar] ✅ Initialized FullCalendar Draggable: "${cardTitle}"`);
        
        // Add drag event listeners with better logging
        cardEl.addEventListener('dragstart', (e) => {
          this.currentDragEventName = cardTitle; // Store for throttled logging
          console.log(`🚀 [Calendar] Native drag started for \`${cardTitle}\``);
          
          (cardEl as HTMLElement).style.opacity = '0.5';
          (cardEl as HTMLElement).style.transform = 'scale(0.9)';
          
          const calendarEl = document.querySelector('.fc');
          calendarEl?.classList.add('external-drag-active');
          
          console.log('[Calendar] Calendar marked as external-drag-active');
        });
        
        cardEl.addEventListener('dragend', (e) => {
          console.log(`🏁 [Calendar] Native drag ended for \`${cardTitle}\``);
          
          (cardEl as HTMLElement).style.opacity = '';
          (cardEl as HTMLElement).style.transform = '';
          
          const calendarEl = document.querySelector('.fc');
          calendarEl?.classList.remove('external-drag-active');
          
          // Reset drag context
          this.currentDragEventName = '';
          this.lastHoveredTimeSlot = '';
        });
        
      } catch (error) {
        console.error(`[Calendar] ❌ Error initializing draggable for "${cardTitle}":`, error);
        console.error('[Calendar] Error stack:', error);
      }
    });
    
    console.log(`[Calendar] ✅ Completed initialization of ${eventCards.length} draggable cards`);
    console.log('[Calendar] FullCalendar should now detect drops from these elements');
  }
}