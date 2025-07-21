import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCard, EventType } from '@shared/data-access/models/event.model';
import { EventTypeBadgeComponent } from '@shared/ui/event-type-badge/event-type-badge.component';
import { EventDetailsListComponent, EventDetailItem } from '@shared/ui/event-details-list/event-details-list.component';
import { LifestyleTagsComponent } from '@shared/ui/lifestyle-tags/lifestyle-tags.component';

@Component({
  selector: 'app-event-card',
  imports: [CommonModule, EventTypeBadgeComponent, EventDetailsListComponent, LifestyleTagsComponent],
  template: `
    <div 
      class="event-card"
      [class.selected]="isSelected"
      [class.low-confidence]="card.confidence < 0.5"
      [attr.data-card-id]="card.id"
      [attr.data-event-title]="card.extractedTitle"
      [attr.data-event]="getCardDataForDrag()"
      [attr.data-duration]="card.suggestedDurationMinutes || 50"
      draggable="true"
      (click)="onCardClick()"
      (dragstart)="onDragStart($event)"
      (dragend)="onDragEnd($event)">
      
      <div class="card-header">
        <app-event-type-badge [type]="card.suggestedType"></app-event-type-badge>
        
        <div class="header-right">
          <div class="confidence-badge" [class]="getConfidenceClass()">
            {{(card.confidence * 100).toFixed(0)}}%
          </div>
          <button 
            type="button" 
            class="delete-btn"
            (click)="onDeleteClick($event)"
            title="Delete this card">
            ×
          </button>
        </div>
      </div>

      <div class="card-content">
        <h4 class="event-title editable" 
            (click)="onEditTitle($event)"
            title="Click to edit title">{{card.extractedTitle}}</h4>
        
        @if (card.extractedDescription) {
          <p class="event-description editable" 
             (click)="onEditDescription($event)"
             title="Click to edit description">{{card.extractedDescription}}</p>
        }

        <app-lifestyle-tags 
          [tags]="getLifestyleTags()" 
          [compact]="true">
        </app-lifestyle-tags>

        <app-event-details-list 
          [details]="getEventDetails()"
          [showNoDetailsMessage]="true">
        </app-event-details-list>
      </div>

      <details class="card-footer">
        <summary>AI Analysis</summary>
        <div class="reasoning">{{card.reasoning}}</div>
      </details>
      
      <div class="card-actions">
        <button 
          type="button" 
          class="customize-btn"
          (click)="onCustomizeClick($event)"
          [disabled]="!isSelected">
          Customize
        </button>
      </div>
      
      @if (isSelected) {
        <div class="selected-indicator">
          <span>✓</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .event-card {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      background: white;
      cursor: grab;
      transition: all 0.2s ease;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .event-card:active {
      cursor: grabbing;
    }

    .event-card.dragging {
      opacity: 0.5;
      transform: scale(0.95);
      cursor: grabbing;
    }

    .event-card:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .event-card.selected {
      border-color: #10b981;
      background: #f0fdf4;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .event-card.low-confidence {
      border-color: #f59e0b;
      background: #fffbeb;
    }

    .event-card.low-confidence:hover {
      border-color: #d97706;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }


    .confidence-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
    }

    .confidence-badge.high {
      background: #d1fae5;
      color: #065f46;
    }

    .confidence-badge.medium {
      background: #fef3c7;
      color: #92400e;
    }

    .confidence-badge.low {
      background: #fee2e2;
      color: #991b1b;
    }

    .delete-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: #f3f4f6;
      color: #6b7280;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      line-height: 1;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .delete-btn:hover {
      background: #fee2e2;
      color: #dc2626;
      transform: scale(1.1);
    }

    .delete-btn:active {
      transform: scale(0.95);
    }

    .card-content {
      margin-bottom: 0.75rem;
    }

    .event-title {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.1rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .event-title.editable {
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .event-title.editable:hover {
      background-color: #f3f4f6;
    }

    .event-description {
      margin: 0 0 1rem 0;
      color: #4b5563;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .event-description.editable {
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .event-description.editable:hover {
      background-color: #f3f4f6;
    }



    .card-footer {
      border-top: 1px solid #f3f4f6;
      margin-top: 0.75rem;
      padding-top: 0.5rem;
    }

    .card-footer summary {
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      cursor: pointer;
      padding: 0.25rem 0;
      list-style: none;
      user-select: none;
    }

    .card-footer summary::-webkit-details-marker {
      display: none;
    }

    .card-footer summary::before {
      content: '▶';
      margin-right: 0.25rem;
      transition: transform 0.2s ease;
      font-size: 0.6rem;
    }

    .card-footer[open] summary::before {
      transform: rotate(90deg);
    }

    .reasoning {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }

    .customize-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-weight: 500;
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .customize-btn:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .customize-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .event-card.selected .customize-btn {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }

    .event-card.selected .customize-btn:hover:not(:disabled) {
      background: #059669;
    }

    .selected-indicator {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 28px;
      height: 28px;
      background: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.9rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 640px) {
      .event-card {
        padding: 0.75rem;
      }
      
      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
    }
  `]
})
export class EventCardComponent {
  @Input() card!: EventCard;
  @Input() isSelected = false;

  @Output() cardClick = new EventEmitter<void>();
  @Output() customizeClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();
  @Output() dragStart = new EventEmitter<{card: EventCard}>();
  @Output() dragEnd = new EventEmitter<{card: EventCard}>();
  @Output() titleEdit = new EventEmitter<{card: EventCard, newTitle: string}>();
  @Output() descriptionEdit = new EventEmitter<{card: EventCard, newDescription: string}>();

  onCardClick(): void {
    this.cardClick.emit();
  }

  onCustomizeClick(event: Event): void {
    event.stopPropagation(); // Prevent card selection when clicking customize
    this.customizeClick.emit();
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation(); // Prevent card selection when clicking delete
    this.deleteClick.emit();
  }

  onEditTitle(event: Event): void {
    event.stopPropagation(); // Prevent card selection when clicking to edit
    const currentTitle = this.card.extractedTitle;
    const newTitle = prompt('Edit event title:', currentTitle);
    
    if (newTitle && newTitle.trim() !== '' && newTitle !== currentTitle) {
      this.titleEdit.emit({card: this.card, newTitle: newTitle.trim()});
    }
  }

  onEditDescription(event: Event): void {
    event.stopPropagation(); // Prevent card selection when clicking to edit
    const currentDescription = this.card.extractedDescription || '';
    const newDescription = prompt('Edit event description:', currentDescription);
    
    if (newDescription !== null && newDescription !== currentDescription) {
      this.descriptionEdit.emit({card: this.card, newDescription: newDescription.trim()});
    }
  }

  onDragStart(event: DragEvent): void {
    console.log(`🚀 [EventCard] Drag start: "${this.card.extractedTitle}" (${this.card.suggestedDurationMinutes || 50}min)`);
    
    const target = event.target as HTMLElement;
    
    // Set drag data for FullCalendar compatibility
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', this.card.extractedTitle);
      const jsonData = {
        id: this.card.id,
        title: this.card.extractedTitle,
        duration: this.card.suggestedDurationMinutes || 50
      };
      event.dataTransfer.setData('application/json', JSON.stringify(jsonData));
      event.dataTransfer.effectAllowed = 'copy';
    } else {
      console.warn('[EventCard] No dataTransfer available on drag event!');
    }
    
    // Add dragging class for visual feedback
    target.classList.add('dragging');
    
    // Ensure the element has the title and duration data that FullCalendar can read
    const eventTitle = this.card.extractedTitle;
    const eventDuration = (this.card.suggestedDurationMinutes || 50).toString();
    const eventId = this.card.id;
    
    target.setAttribute('data-event-title', eventTitle);
    target.setAttribute('data-event-duration', eventDuration);
    target.setAttribute('data-event-id', eventId);
    
    // Emit drag start event to parent components
    this.dragStart.emit({card: this.card});
  }

  onDragEnd(event: DragEvent): void {
    console.log(`🏁 [EventCard] Drag end: "${this.card.extractedTitle}"`);
    
    // Remove dragging class
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    
    // Emit drag end event to parent components
    this.dragEnd.emit({card: this.card});
  }


  getConfidenceClass(): string {
    if (this.card.confidence >= 0.8) return 'high';
    if (this.card.confidence >= 0.5) return 'medium';
    return 'low';
  }


  getCardDataForDrag(): string {
    return JSON.stringify({
      id: this.card.id,
      title: this.card.extractedTitle,
      suggestedDurationMinutes: this.card.suggestedDurationMinutes || 50
    });
  }

  getLifestyleTags(): string[] {
    return LifestyleTagsComponent.generateTagsFromContent(
      this.card.extractedTitle,
      this.card.extractedDescription || '',
      this.card.suggestedType
    );
  }

  getEventDetails(): EventDetailItem[] {
    const details: EventDetailItem[] = [];

    // Add date detail if available
    if (this.card.suggestedStartDate) {
      details.push(EventDetailsListComponent.createDateDetail(this.card.suggestedStartDate));
    }

    // Add time detail if available
    if (this.card.suggestedTime) {
      details.push(EventDetailsListComponent.createTimeDetail(this.card.suggestedTime));
    }

    // Add duration detail if available
    if (this.card.suggestedDurationMinutes) {
      details.push(EventDetailsListComponent.createDurationDetail(this.card.suggestedDurationMinutes));
    }

    return details;
  }
}