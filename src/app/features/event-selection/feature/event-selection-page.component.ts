import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormBuilder, Validators } from '@angular/forms';
import { CalendarSessionStore } from '@shared/data-access/stores/calendar-session.store';
import { CalendarService } from '@shared/data-access/services/calendar.service';
import { LLMEventService } from '@shared/data-access/services/llm-event.service';
import { CalendarActivityAnnouncerService } from '@shared/data-access/services/calendar-activity-announcer.service';
import { EventCard, Event, CalendarEvent } from '@shared/data-access/models/event.model';
import { MainPageState } from '@shared/data-access/models/session.model';
import { EventCardsGridComponent } from '../ui/event-cards-grid.component';
import { CalendarDisplayComponent } from '../../calendar/ui/calendar-display.component';
import { CalendarAnnouncementsComponent } from '@shared/ui/calendar-announcements/calendar-announcements.component';

@Component({
  selector: 'app-event-selection-page',
  imports: [CommonModule, ReactiveFormsModule, EventCardsGridComponent, CalendarDisplayComponent, CalendarAnnouncementsComponent],
  template: `
    <div class="page-content">
      <!-- Always Visible Note Input Section -->
      <div class="note-input-section">
        <h1>Smart Event Creator</h1>
        <p>Enter your tasks, events, or reminders (one per line) and I'll help you create calendar events:</p>

        <form [formGroup]="noteForm" (ngSubmit)="onSubmitNote()">
          <label for="note-input">Your note:</label>
          <textarea
            id="note-input"
            formControlName="noteInput"
            rows="4"
            [placeholder]="placeholder">
          </textarea>

          <div class="note-actions">
            <button
              type="submit"
              [disabled]="noteForm.invalid || isProcessingInitial">
              {{isProcessingInitial ? 'Processing with AI...' : 'Create Event Cards'}}
            </button>
            
            @if (hasGeneratedCards()) {
              <button 
                type="button" 
                class="secondary"
                (click)="startOver()">
                Clear All
              </button>
            }
          </div>
        </form>

        @if (errorMessage) {
          <div role="alert" class="error">
            {{errorMessage}}
          </div>
        }
        
        @if (processingNotes.length > 0) {
          <div class="processing-notes">
            <h3>AI Processing Results:</h3>
            <ul>
              @for (note of processingNotes; track note) {
                <li>{{note}}</li>
              }
            </ul>
          </div>
        }
      </div>

      <!-- Always Visible Content Layout -->
      <div class="content-layout">
        <div class="events-section">
          <h2>Event Options</h2>
          
          <div class="auto-add-section">
            <label class="auto-add-checkbox">
              <input 
                type="checkbox" 
                [formControl]="autoAddControl"
                (change)="onAutoAddToggle()">
              <span class="checkmark"></span>
              Automatically add events to calendar
            </label>
            <p class="auto-add-help">When enabled, all generated events will be automatically placed in available time slots</p>
          </div>
          
          @if (generatedCards().length > 0) {
            <app-event-cards-grid
              [cards]="generatedCards()"
              [selectedCardId]="selectedCard()?.id || null"
              (cardSelected)="onCardSelected($event)"
              (cardCustomize)="onCardCustomize($event)"
              (cardDelete)="onCardDelete($event)"
              (cardDragStart)="onCardDragStart($event)"
              (cardDragEnd)="onCardDragEnd($event)"
              (cardTitleEdit)="onCardTitleEdit($event)"
              (cardDescriptionEdit)="onCardDescriptionEdit($event)">
            </app-event-cards-grid>
            
            <div class="actions">
              <button 
                type="button"
                [disabled]="!selectedCard()"
                (click)="proceedToCalendar()">
                Add Selected Event to Calendar
              </button>
            </div>
          } @else {
            <div class="no-cards">
              <h3>No event cards yet</h3>
              <p>Enter a note above to generate event suggestions, or try one of the examples.</p>
            </div>
          }

          @if (processingResult() && !processingResult()!.processingSuccess) {
            <div class="error">
              <strong>Processing Error:</strong>
              {{processingResult()!.errorMessage}}
            </div>
          }
        </div>

        <div class="calendar-section">
          <h2>Your Calendar</h2>
          <div class="calendar-wrapper">
            <app-calendar-display
              [events]="calendarEvents()"
              [view]="'timeGridWeek'"
              [currentDraggedCard]="currentDraggedCard"
              (eventClick)="onEventClick($event)"
              (dateClick)="onDateClick($event)"
              (eventDrop)="onEventDrop($event)">
            </app-calendar-display>
          </div>
          
          <div class="calendar-info">
            @if (hasGeneratedCards()) {
              <p><strong>💡 Tip:</strong> Drag event cards directly onto time slots to schedule them!</p>
            } @else {
              <p><strong>💡 Tip:</strong> Create event cards above, then drag them onto your preferred time slots!</p>
            }
            @if (calendarEvents().length > 0) {
              <p><strong>📅 You have {{calendarEvents().length}} event(s) scheduled.</strong></p>
            }
          </div>
          
          <!-- Calendar Activity Announcements -->
          <div class="calendar-announcements">
            <app-calendar-announcements></app-calendar-announcements>
          </div>
        </div>
      </div>

      @if (isCreatingEvent) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <p>Creating your calendar event...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1rem;
      position: relative;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      margin-bottom: 2rem;
    }

    .events-section h2, .calendar-section h2 {
      color: #1f2937;
      margin-bottom: 1rem;
      font-size: 1.25rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }

    .calendar-wrapper {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e5e7eb;
    }

    .calendar-info {
      margin-top: 1rem;
      padding: 1rem;
      background: #f0f9ff;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }

    .calendar-info p {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
      font-size: 0.9rem;
    }

    .calendar-info p:last-child {
      margin-bottom: 0;
    }

    .header {
      margin-bottom: 2rem;
    }

    .header h1 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .header p {
      color: #6b7280;
      margin-bottom: 1rem;
    }

    .original-note-editor {
      padding: 1rem;
      background: #f3f4f6;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }

    .original-note-editor label {
      display: block;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .note-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      resize: vertical;
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      color: #1f2937;
      background: white;
    }

    .note-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .note-actions {
      margin-top: 0.75rem;
      display: flex;
      justify-content: flex-end;
    }

    .regenerate-btn {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 500;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .regenerate-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .regenerate-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .no-cards {
      text-align: center;
      padding: 3rem 2rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 2px dashed #d1d5db;
    }

    .no-cards h3 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .no-cards p {
      color: #6b7280;
    }

    .error {
      margin: 1rem 0;
      padding: 1rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
    }

    .error strong {
      display: block;
      margin-bottom: 0.5rem;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }

    button {
      padding: 0.875rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    button:not(.secondary) {
      background: #3b82f6;
      color: white;
    }

    button:not(.secondary):hover:not(:disabled) {
      background: #2563eb;
    }

    button:not(.secondary):disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    button.secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    button.secondary:hover {
      background: #e5e7eb;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 10;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .loading-overlay p {
      color: #374151;
      font-weight: 500;
    }

    @media (max-width: 1024px) {
      .content-layout {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      
      .page-content {
        max-width: 900px;
      }
    }

    @media (max-width: 640px) {
      .actions {
        flex-direction: column;
      }
      
      .calendar-wrapper {
        padding: 0.5rem;
      }
    }
    
    /* Note Input Section Styles */
    .note-input-section {
      margin-bottom: 2rem;
      padding: 2rem;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .note-input-section h1 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .note-input-section p {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .note-input-section textarea {
      width: 100%;
      min-height: 100px;
      padding: 1rem;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 1rem;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.2s ease;
    }

    .note-input-section textarea:focus {
      border-color: #3b82f6;
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .note-input-section label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
    }

    .note-input-section .note-actions {
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .processing-notes {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #eff6ff;
      border: 1px solid #3b82f6;
      border-radius: 8px;
    }
    
    .processing-notes h3 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
    }
    
    .processing-notes ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #1f2937;
    }
    
    .processing-notes li {
      margin-bottom: 0.25rem;
    }

    /* Auto-add section styles */
    .auto-add-section {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .auto-add-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .auto-add-checkbox input[type="checkbox"] {
      margin-right: 0.75rem;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .auto-add-help {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
      margin-left: 2.25rem;
    }

    /* Calendar announcements section */
    .calendar-announcements {
      margin-top: 1rem;
    }
  `]
})
export class EventSelectionPageComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private calendarStore = inject(CalendarSessionStore);
  private calendarService = inject(CalendarService);
  private llmEventService = inject(LLMEventService);
  private activityAnnouncer = inject(CalendarActivityAnnouncerService);

  // Signals from store
  generatedCards = this.calendarStore.generatedCards;
  selectedCard = this.calendarStore.selectedCard;
  processingResult = this.calendarStore.lastProcessingResult;
  originalNote = this.calendarStore.currentNote;
  currentState = this.calendarStore.currentState;
  calendarEvents = this.calendarStore.calendarEventsList;
  hasGeneratedCards = this.calendarStore.hasGeneratedCards;

  // Form controls
  noteForm = this.fb.group({
    noteInput: ['', [Validators.required, Validators.minLength(5)]]
  });
  noteControl = new FormControl('');
  autoAddControl = new FormControl(false);

  // State management
  isCreatingEvent = false;
  isRegenerating = false;
  isProcessingInitial = false;
  errorMessage = '';
  processingNotes: string[] = [];
  currentDraggedCard: EventCard | null = null;

  // Placeholder for note input
  placeholder = `Enter one event per line for best results...

For example:
Team meeting with Sarah and Mike on Friday at 2pm to discuss Q4 goals
Dentist appointment next Tuesday at 10am  
Submit expense report by end of week
Call mom this weekend to discuss holiday plans`;


  constructor() {
    // Initialize calendar session when component loads
    this.calendarStore.startNewSession();
  }

  ngOnInit(): void {
    // Initialize form controls with current note
    const currentNote = this.originalNote() || '';
    this.noteControl.setValue(currentNote);
    this.noteForm.patchValue({ noteInput: currentNote });
  }

  onCardSelected(card: EventCard): void {
    console.log('[EventSelection] Card selected:', card.extractedTitle);
    this.calendarStore.selectEventCard(card);
  }

  onCardCustomize(card: EventCard): void {
    console.log('[EventSelection] Card customization requested:', card.extractedTitle);
    // For now, just select the card. In the future, could open a modal for customization
    this.calendarStore.selectEventCard(card);
  }

  onCardDelete(card: EventCard): void {
    console.log('[EventSelection] Card deletion requested:', card.extractedTitle);
    this.calendarStore.deleteEventCard(card.id);
  }

  onEventClick(event: Event): void {
    console.log('[EventSelection] Calendar event clicked:', event.title);
    // Could show event details or allow editing
  }

  onDateClick(date: Date): void {
    console.log('[EventSelection] Calendar date clicked:', date);
    // Could auto-set the selected card's date to the clicked date
    const selected = this.selectedCard();
    if (selected) {
      // Update the selected card with the clicked date
      // This would require extending the store with an update method
      console.log(`[EventSelection] Could set event date to: ${date}`);
    }
  }

  onEventDrop(dropInfo: {cardId: string, date: Date, allDay?: boolean, durationMinutes?: number}): void {
    console.log('📨 [EventSelection] EVENT DROP RECEIVED FROM CALENDAR!');
    console.log('[EventSelection] Drop info received:', dropInfo);
    console.log('[EventSelection] Available generated cards:', this.generatedCards().map(c => ({id: c.id, title: c.extractedTitle})));
    
    // Find the card that was dropped
    const card = this.generatedCards().find(c => c.id === dropInfo.cardId);
    console.log('[EventSelection] Found matching card:', card);
    
    if (!card) {
      console.error('❌ [EventSelection] Dropped card not found! cardId:', dropInfo.cardId);
      console.log('[EventSelection] Available card IDs:', this.generatedCards().map(c => c.id));
      return;
    }

    console.log('✅ [EventSelection] Card found, proceeding with event creation...');
    
    // Select the card and update its suggested date/time
    console.log('[EventSelection] Selecting dropped card in store...');
    this.calendarStore.selectEventCard(card);
    
    // Create and add event immediately
    console.log('[EventSelection] Starting event creation process...');
    this.createEventFromDrop(card, dropInfo);
  }

  private async createEventFromDrop(card: EventCard, dropInfo: {date: Date, allDay?: boolean, durationMinutes?: number}): Promise<void> {
    console.log('🎨 [EventSelection] CREATING EVENT FROM DROP...');
    console.log('[EventSelection] Card to create event from:', {
      id: card.id,
      title: card.extractedTitle,
      suggestedDuration: card.suggestedDurationMinutes
    });
    console.log('[EventSelection] Drop info for event creation:', dropInfo);
    
    this.isCreatingEvent = true;

    try {
      // Use the duration from drop info, card's suggested duration, or default to 50 minutes (2 pomodoros)
      const durationMinutes = dropInfo.durationMinutes || card.suggestedDurationMinutes || 50;
      console.log('[EventSelection] Calculated duration minutes:', durationMinutes);
      
      // Create event with the drop date/time and proper duration
      const customizations = {
        startDate: dropInfo.date,
        isAllDay: dropInfo.allDay || false,
        durationMinutes,
        // Calculate end date based on duration
        endDate: dropInfo.allDay ? undefined : new Date(dropInfo.date.getTime() + durationMinutes * 60 * 1000)
      };
      
      console.log('[EventSelection] Event customizations:', customizations);
      console.log('[EventSelection] Calling calendar service to create event...');
      
      const newEvent = this.calendarService.createEventFromCard(card, customizations);
      
      console.log('[EventSelection] Event created by service:', newEvent);
      console.log('[EventSelection] Adding event to calendar store...');
      
      // Add to calendar store
      this.calendarStore.addEventToCalendar(newEvent);
      
      // Announce the event addition
      this.activityAnnouncer.announceEventAdded(newEvent, 'drag-and-drop');
      
      console.log('✅ [EventSelection] Event successfully added to calendar store!');
      console.log('🎆 [EventSelection] Event creation completed successfully!');
      
      // Don't navigate automatically, let user stay on the page
      // setTimeout(() => {
      //   this.router.navigate(['/calendar']);
      // }, 1000);
      
    } catch (error) {
      console.error('❌ [EventSelection] ERROR creating event from drop:', error);
      console.error('[EventSelection] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace available'
      });
    } finally {
      console.log('[EventSelection] Cleaning up - setting isCreatingEvent to false');
      this.isCreatingEvent = false;
    }
  }

  async proceedToCalendar(): Promise<void> {
    const selectedCard = this.selectedCard();
    if (!selectedCard) {
      console.warn('[EventSelection] No card selected');
      return;
    }

    this.isCreatingEvent = true;

    try {
      console.log('[EventSelection] Creating event from selected card');
      
      // Create event from the selected card
      const newEvent = this.calendarService.createEventFromCard(selectedCard);
      
      // Add to calendar store
      this.calendarStore.addEventToCalendar(newEvent);
      
      // Announce the event addition
      this.activityAnnouncer.announceEventAdded(newEvent, 'manual selection');
      
      console.log('[EventSelection] Event created and added to calendar:', newEvent);
      
      // Navigate to calendar view
      await this.router.navigate(['/calendar']);
      
    } catch (error) {
      console.error('[EventSelection] Error creating event:', error);
      // Could show an error message to user here
    } finally {
      this.isCreatingEvent = false;
    }
  }

  async regenerateCards(): Promise<void> {
    const noteText = this.noteControl.value?.trim();
    if (!noteText || this.isRegenerating) {
      return;
    }

    this.isRegenerating = true;
    console.log('[EventSelection] Regenerating cards for note:', noteText);

    try {
      // Validate the note
      const validation = this.llmEventService.validateNoteInput(noteText);
      if (!validation.isValid) {
        console.warn('[EventSelection] Invalid note:', validation.errors);
        // Could show error messages to user here
        return;
      }

      // Process the edited note
      const result = await this.llmEventService.processNoteForEvents(noteText);
      
      // Update the store with new results
      this.calendarStore.setCurrentNote(noteText);
      this.calendarStore.setProcessingResult(result);
      
      console.log('[EventSelection] Cards regenerated successfully');
      
    } catch (error) {
      console.error('[EventSelection] Error regenerating cards:', error);
    } finally {
      this.isRegenerating = false;
    }
  }

  async onSubmitNote(): Promise<void> {
    if (this.noteForm.invalid) {
      this.errorMessage = 'Please enter a note to process.';
      return;
    }

    this.isProcessingInitial = true;
    this.errorMessage = '';
    this.processingNotes = [];

    try {
      const noteText = this.noteForm.value.noteInput!;

      // Validate note input
      const validation = this.llmEventService.validateNoteInput(noteText);
      if (!validation.isValid) {
        this.errorMessage = validation.errors.join('. ');
        return;
      }

      // Update store with current note
      this.calendarStore.setCurrentNote(noteText);
      this.calendarStore.setCurrentState(MainPageState.EVENT_GENERATION);

      this.processingNotes.push('Processing note with AI...');

      // Process note with LLM service
      const processingResult = await this.llmEventService.processNoteForEvents(noteText);
      
      this.processingNotes.push(`Generated ${processingResult.generatedCards.length} event cards`);
      this.processingNotes.push(`Processing time: ${processingResult.processingTime}ms`);

      if (!processingResult.processingSuccess) {
        this.errorMessage = processingResult.errorMessage || 'Failed to process note';
        return;
      }

      // Update store with processing result
      this.calendarStore.setProcessingResult(processingResult);
      
      // Update the note control for editing
      this.noteControl.setValue(noteText);

      console.log(`Generated ${processingResult.generatedCards.length} event cards:`, processingResult.generatedCards);
      
      // Auto-add events to calendar if checkbox is enabled
      if (this.autoAddControl.value && processingResult.generatedCards.length > 0) {
        setTimeout(() => {
          this.autoAddAllEventsToCalendar();
        }, 100); // Small delay to allow UI to update
      }
      
    } catch (error) {
      this.errorMessage = 'Something went wrong processing your note. Please try again.';
      console.error('Note processing error:', error);
    } finally {
      this.isProcessingInitial = false;
    }
  }

  startOver(): void {
    console.log('[EventSelection] Starting over');
    this.calendarStore.resetForNewNote();
    this.noteForm.reset();
    this.noteControl.setValue('');
    this.errorMessage = '';
    this.processingNotes = [];
    this.currentDraggedCard = null;
  }

  onCardDragStart(event: {card: EventCard}): void {
    console.log(`[EventSelection] Card drag started: "${event.card.extractedTitle}"`);
    this.currentDraggedCard = event.card;
  }

  onCardDragEnd(event: {card: EventCard}): void {
    console.log(`[EventSelection] Card drag ended: "${event.card.extractedTitle}"`);
    this.currentDraggedCard = null;
  }

  onCardTitleEdit(event: {card: EventCard, newTitle: string}): void {
    console.log(`[EventSelection] Title edit requested: "${event.card.extractedTitle}" -> "${event.newTitle}"`);
    this.calendarStore.updateEventCardTitle(event.card.id, event.newTitle);
  }

  onCardDescriptionEdit(event: {card: EventCard, newDescription: string}): void {
    console.log(`[EventSelection] Description edit requested for: "${event.card.extractedTitle}"`);
    this.calendarStore.updateEventCardDescription(event.card.id, event.newDescription);
  }

  onAutoAddToggle(): void {
    const isAutoAdd = this.autoAddControl.value;
    console.log('[EventSelection] Auto-add toggled:', isAutoAdd);
    
    if (isAutoAdd && this.generatedCards().length > 0) {
      // Automatically add all existing cards to calendar
      this.autoAddAllEventsToCalendar();
    }
  }

  private async autoAddAllEventsToCalendar(): Promise<void> {
    console.log('[EventSelection] Auto-adding all events to calendar...');
    
    const cards = this.generatedCards();
    if (cards.length === 0) return;

    this.isCreatingEvent = true;

    try {
      // Find available time slots for events
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0); // Start at 9 AM
      let currentSlot = new Date(startOfToday);
      const createdEvents: Event[] = [];

      // Check if any existing events need to be moved
      const existingEvents = this.calendarEvents();
      const movedEvents: {event: CalendarEvent, oldTime: Date, newTime: Date}[] = [];

      for (const card of cards) {
        // Find next available slot
        const originalSlot = new Date(currentSlot);
        currentSlot = this.findNextAvailableSlot(currentSlot, card.suggestedDurationMinutes || 50);
        
        // Check if we had to move past existing events
        if (originalSlot.getTime() !== currentSlot.getTime()) {
          const conflictingEvents = existingEvents.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end || eventStart.getTime() + 60 * 60 * 1000);
            return (originalSlot >= eventStart && originalSlot < eventEnd);
          });
          
          // Record moved events (simplified - in real implementation would actually move them)
          conflictingEvents.forEach(conflictEvent => {
            movedEvents.push({
              event: conflictEvent,
              oldTime: new Date(conflictEvent.start),
              newTime: new Date(currentSlot.getTime() + (card.suggestedDurationMinutes || 50) * 60 * 1000 + 30 * 60 * 1000)
            });
          });
        }
        
        const customizations = {
          startDate: new Date(currentSlot),
          isAllDay: false,
          durationMinutes: card.suggestedDurationMinutes || 50,
          endDate: new Date(currentSlot.getTime() + (card.suggestedDurationMinutes || 50) * 60 * 1000)
        };

        // Create and add event
        const newEvent = this.calendarService.createEventFromCard(card, customizations);
        this.calendarStore.addEventToCalendar(newEvent);
        createdEvents.push(newEvent);

        // Announce individual event addition
        this.activityAnnouncer.announceEventAdded(newEvent, 'auto-add');

        // Move to next slot (add 15 minute buffer)
        currentSlot = new Date(currentSlot.getTime() + (card.suggestedDurationMinutes || 50) * 60 * 1000 + 15 * 60 * 1000);
      }

      // Announce batch operation
      if (createdEvents.length > 1) {
        this.activityAnnouncer.announceBatchEventsAdded(createdEvents, 'line-based parsing');
      }

      // Announce any events that were moved
      movedEvents.forEach(({event, oldTime, newTime}) => {
        this.activityAnnouncer.announceEventMoved(event, 'to accommodate new events', oldTime, newTime);
      });

      // Announce smart scheduling decision
      if (movedEvents.length > 0) {
        this.activityAnnouncer.announceSmartScheduling(
          `Automatically scheduled ${createdEvents.length} new events`,
          `${movedEvents.length} existing events were rescheduled to avoid conflicts`
        );
      } else {
        this.activityAnnouncer.announceSmartScheduling(
          `Found perfect time slots for all ${createdEvents.length} events`,
          'No existing events needed to be moved'
        );
      }

      console.log(`[EventSelection] Successfully auto-added ${cards.length} events to calendar`);
      
    } catch (error) {
      console.error('[EventSelection] Error auto-adding events:', error);
    } finally {
      this.isCreatingEvent = false;
    }
  }

  private findNextAvailableSlot(startTime: Date, durationMinutes: number): Date {
    // Simple implementation: find next available slot after existing events
    // This could be enhanced to check for actual conflicts
    const existingEvents = this.calendarEvents();
    let candidateTime = new Date(startTime);

    // Check if this slot conflicts with existing events
    for (const event of existingEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end || eventStart.getTime() + 60 * 60 * 1000); // Default 1 hour if no end
      const candidateEnd = new Date(candidateTime.getTime() + durationMinutes * 60 * 1000);

      // Check for overlap
      if ((candidateTime >= eventStart && candidateTime < eventEnd) ||
          (candidateEnd > eventStart && candidateEnd <= eventEnd) ||
          (candidateTime <= eventStart && candidateEnd >= eventEnd)) {
        // Conflict found, move to after this event
        candidateTime = new Date(eventEnd.getTime() + 15 * 60 * 1000); // 15 minute buffer
        break;
      }
    }

    return candidateTime;
  }
}