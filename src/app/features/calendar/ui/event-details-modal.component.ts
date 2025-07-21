import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Event, EventType } from '@shared/data-access/models/event.model';
import { CalendarService } from '@shared/data-access/services/calendar.service';

@Component({
  selector: 'app-event-details-modal',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    @if (isOpen) {
      <div class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{isEditing ? 'Edit Event' : 'Event Details'}}</h2>
            <button 
              type="button" 
              class="close-btn"
              (click)="closeModal()">
              ×
            </button>
          </div>

          <div class="modal-body">
            @if (!isEditing) {
              <!-- View Mode -->
              <div class="event-display">
                <div class="event-type">
                  <span class="type-icon">{{getEventTypeIcon(event.type)}}</span>
                  <span class="type-label">{{getEventTypeLabel(event.type)}}</span>
                </div>

                <h3 class="event-title">{{event.title}}</h3>
                
                @if (event.description) {
                  <div class="event-description">
                    <strong>Description:</strong>
                    <p>{{event.description}}</p>
                  </div>
                }

                <div class="event-details">
                  <div class="detail-row">
                    <strong>Date & Time:</strong>
                    <span>{{formatEventTime(event)}}</span>
                  </div>
                  
                  @if (event.location) {
                    <div class="detail-row">
                      <strong>Location:</strong>
                      <span>{{event.location}}</span>
                    </div>
                  }
                  
                  @if (event.attendees && event.attendees.length > 0) {
                    <div class="detail-row">
                      <strong>Attendees:</strong>
                      <span>{{event.attendees.join(', ')}}</span>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <!-- Edit Mode -->
              <form [formGroup]="eventForm" (ngSubmit)="onSave()">
                <div class="form-group">
                  <label for="title">Title *</label>
                  <input 
                    id="title"
                    type="text"
                    formControlName="title"
                    [class.error]="eventForm.get('title')?.invalid && eventForm.get('title')?.touched">
                  @if (eventForm.get('title')?.invalid && eventForm.get('title')?.touched) {
                    <div class="field-error">Title is required</div>
                  }
                </div>

                <div class="form-group">
                  <label for="description">Description</label>
                  <textarea 
                    id="description"
                    formControlName="description"
                    rows="3">
                  </textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="type">Type</label>
                    <select id="type" formControlName="type">
                      <option value="meeting">🤝 Meeting</option>
                      <option value="task">✅ Task</option>
                      <option value="reminder">🔔 Reminder</option>
                      <option value="appointment">📅 Appointment</option>
                      <option value="deadline">⏰ Deadline</option>
                      <option value="personal">🏠 Personal</option>
                      <option value="work">💼 Work</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        formControlName="isAllDay"> 
                      All day event
                    </label>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="startDate">Start Date *</label>
                    <input 
                      id="startDate"
                      type="date"
                      formControlName="startDate"
                      [class.error]="eventForm.get('startDate')?.invalid && eventForm.get('startDate')?.touched">
                    @if (eventForm.get('startDate')?.invalid && eventForm.get('startDate')?.touched) {
                      <div class="field-error">Start date is required</div>
                    }
                  </div>

                  @if (!isAllDayEvent) {
                    <div class="form-group">
                      <label for="startTime">Start Time</label>
                      <input 
                        id="startTime"
                        type="time"
                        formControlName="startTime">
                    </div>
                  }
                </div>

                @if (!isAllDayEvent) {
                  <div class="form-row">
                    <div class="form-group">
                      <label for="endDate">End Date</label>
                      <input 
                        id="endDate"
                        type="date"
                        formControlName="endDate">
                    </div>

                    <div class="form-group">
                      <label for="endTime">End Time</label>
                      <input 
                        id="endTime"
                        type="time"
                        formControlName="endTime">
                    </div>
                  </div>
                }

                <div class="form-group">
                  <label for="location">Location</label>
                  <input 
                    id="location"
                    type="text"
                    formControlName="location">
                </div>

                <div class="form-group">
                  <label for="attendees">Attendees (comma-separated)</label>
                  <input 
                    id="attendees"
                    type="text"
                    formControlName="attendeesText"
                    placeholder="john@example.com, jane@example.com">
                </div>
              </form>
            }
          </div>

          <div class="modal-footer">
            @if (!isEditing) {
              <button 
                type="button"
                class="edit-btn"
                (click)="startEditing()">
                Edit
              </button>
              <button 
                type="button"
                class="delete-btn"
                (click)="onDelete()">
                Delete
              </button>
            } @else {
              <button 
                type="button"
                class="cancel-btn"
                (click)="cancelEditing()">
                Cancel
              </button>
              <button 
                type="submit"
                class="save-btn"
                [disabled]="eventForm.invalid"
                (click)="onSave()">
                Save Changes
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-header h2 {
      margin: 0;
      color: #1f2937;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #6b7280;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .event-display {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .event-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .type-icon {
      font-size: 1.25rem;
    }

    .type-label {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      color: #6b7280;
    }

    .event-title {
      margin: 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .event-description {
      margin: 0;
    }

    .event-description p {
      margin: 0.5rem 0 0 0;
      color: #4b5563;
      line-height: 1.5;
    }

    .event-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row {
      display: flex;
      gap: 1rem;
    }

    .detail-row strong {
      min-width: 100px;
      color: #374151;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
    }

    input, textarea, select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.95rem;
      transition: border-color 0.2s ease;
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    input.error, textarea.error {
      border-color: #dc2626;
    }

    input[type="checkbox"] {
      width: auto;
      margin-right: 0.5rem;
    }

    .field-error {
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #dc2626;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }

    button {
      padding: 0.75rem 1.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .edit-btn {
      background: #3b82f6;
      color: white;
    }

    .edit-btn:hover {
      background: #2563eb;
    }

    .delete-btn {
      background: #dc2626;
      color: white;
    }

    .delete-btn:hover {
      background: #b91c1c;
    }

    .cancel-btn {
      background: #f3f4f6;
      color: #374151;
    }

    .cancel-btn:hover {
      background: #e5e7eb;
    }

    .save-btn {
      background: #10b981;
      color: white;
    }

    .save-btn:hover:not(:disabled) {
      background: #059669;
    }

    .save-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .modal-content {
        margin: 0;
        max-height: 100vh;
        border-radius: 0;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }

      .detail-row {
        flex-direction: column;
        gap: 0.25rem;
      }

      .detail-row strong {
        min-width: auto;
      }
    }
  `]
})
export class EventDetailsModalComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private calendarService = inject(CalendarService);

  @Input() event!: Event;
  @Input() isOpen = false;

  @Output() close = new EventEmitter<void>();
  @Output() update = new EventEmitter<Event>();
  @Output() delete = new EventEmitter<Event>();

  isEditing = false;

  eventForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    type: ['task' as EventType],
    startDate: ['', Validators.required],
    endDate: [''],
    startTime: [''],
    endTime: [''],
    location: [''],
    attendeesText: [''],
    isAllDay: [false]
  });

  get isAllDayEvent(): boolean {
    return this.eventForm.get('isAllDay')?.value || false;
  }

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(): void {
    if (this.event) {
      this.populateForm();
    }
  }

  private populateForm(): void {
    if (!this.event) return;

    const startDate = new Date(this.event.startDate);
    const endDate = this.event.endDate ? new Date(this.event.endDate) : null;

    this.eventForm.patchValue({
      title: this.event.title,
      description: this.event.description || '',
      type: this.event.type,
      startDate: this.formatDateForInput(startDate),
      endDate: endDate ? this.formatDateForInput(endDate) : '',
      startTime: this.event.startTime || '',
      endTime: this.event.endTime || '',
      location: this.event.location || '',
      attendeesText: this.event.attendees?.join(', ') || '',
      isAllDay: this.event.isAllDay
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.isEditing = false;
    this.close.emit();
  }

  startEditing(): void {
    this.isEditing = true;
  }

  cancelEditing(): void {
    this.isEditing = false;
    this.populateForm(); // Reset form to original values
  }

  onSave(): void {
    if (this.eventForm.invalid) return;

    const formValue = this.eventForm.value;
    const attendees = formValue.attendeesText 
      ? formValue.attendeesText.split(',').map(email => email.trim()).filter(email => email)
      : [];

    const updatedEvent: Event = {
      ...this.event,
      title: formValue.title!,
      description: formValue.description || undefined,
      type: formValue.type as EventType,
      startDate: new Date(formValue.startDate!),
      endDate: formValue.endDate ? new Date(formValue.endDate) : undefined,
      startTime: formValue.startTime || undefined,
      endTime: formValue.endTime || undefined,
      location: formValue.location || undefined,
      attendees,
      isAllDay: formValue.isAllDay || false,
      updatedAt: new Date()
    };

    this.update.emit(updatedEvent);
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this event?')) {
      this.delete.emit(this.event);
    }
  }

  getEventTypeIcon(type: EventType): string {
    return this.calendarService.getEventTypeIcon(type);
  }

  getEventTypeLabel(type: EventType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  formatEventTime(event: Event): string {
    return this.calendarService.formatEventDateRange(event);
  }
}