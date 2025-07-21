import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCard, EventType } from '@shared/data-access/models/event.model';

@Component({
  selector: 'app-event-card',
  imports: [CommonModule],
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
        <div class="event-type">
          <span class="type-icon">{{getTypeIcon(card.suggestedType)}}</span>
          <span class="type-label">{{getTypeLabel(card.suggestedType)}}</span>
        </div>
        
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

        <!-- Lifestyle Tags -->
        <div class="lifestyle-tags">
          @for (tag of getLifestyleTags(); track tag) {
            <span class="lifestyle-tag" 
                  [style.background-color]="getTagDisplay(tag).color + '20'"
                  [style.border-color]="getTagDisplay(tag).color"
                  [style.color]="getTagDisplay(tag).color">
              <span class="tag-emoji">{{getTagDisplay(tag).emoji}}</span>
              <span class="tag-label">{{getTagDisplay(tag).label}}</span>
            </span>
          }
        </div>

        <div class="event-details">
          @if (card.suggestedStartDate) {
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <span class="detail-text">{{formatDate(card.suggestedStartDate)}}</span>
            </div>
          }
          
          @if (card.suggestedTime) {
            <div class="detail-item">
              <span class="detail-icon">🕒</span>
              <span class="detail-text">{{card.suggestedTime}}</span>
            </div>
          }
          
          @if (card.suggestedDurationMinutes) {
            <div class="detail-item">
              <span class="detail-icon">⏱️</span>
              <span class="detail-text">{{formatDuration(card.suggestedDurationMinutes)}}</span>
            </div>
          }
          
          @if (!card.suggestedStartDate && !card.suggestedTime) {
            <div class="detail-item no-timing">
              <span class="detail-icon">⏰</span>
              <span class="detail-text">No specific time suggested</span>
            </div>
          }
        </div>
      </div>

      <div class="card-footer">
        <div class="reasoning">
          <strong>AI Analysis:</strong> {{card.reasoning}}
        </div>
        
        <div class="card-actions">
          <button 
            type="button" 
            class="customize-btn"
            (click)="onCustomizeClick($event)"
            [disabled]="!isSelected">
            Customize
          </button>
        </div>
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
      border-radius: 12px;
      padding: 1.5rem;
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
      margin-bottom: 1rem;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .event-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .type-icon {
      font-size: 1.2rem;
    }

    .type-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b7280;
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
      margin-bottom: 1rem;
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

    .lifestyle-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }

    .lifestyle-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      transition: transform 0.2s ease;
    }

    .lifestyle-tag:hover {
      transform: scale(1.05);
    }

    .tag-emoji {
      font-size: 0.8rem;
    }

    .tag-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .event-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .detail-item.no-timing {
      opacity: 0.6;
    }

    .detail-icon {
      font-size: 0.9rem;
    }

    .detail-text {
      font-size: 0.85rem;
      color: #374151;
    }

    .card-footer {
      border-top: 1px solid #f3f4f6;
      padding-top: 1rem;
    }

    .reasoning {
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .reasoning strong {
      color: #374151;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
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
        padding: 1rem;
      }
      
      .card-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .event-details {
        gap: 0.25rem;
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

  getTypeIcon(type: EventType): string {
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

  getTypeLabel(type: EventType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getConfidenceClass(): string {
    if (this.card.confidence >= 0.8) return 'high';
    if (this.card.confidence >= 0.5) return 'medium';
    return 'low';
  }

  formatDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const eventDate = new Date(date);
    
    if (eventDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}m`;
      }
    }
  }

  getCardDataForDrag(): string {
    return JSON.stringify({
      id: this.card.id,
      title: this.card.extractedTitle,
      suggestedDurationMinutes: this.card.suggestedDurationMinutes || 50
    });
  }

  getLifestyleTags(): string[] {
    const title = this.card.extractedTitle.toLowerCase();
    const description = this.card.extractedDescription?.toLowerCase() || '';
    const type = this.card.suggestedType;
    const content = `${title} ${description}`;
    
    const tags: string[] = [];

    // 🏃‍♀️ Physical Health & Fitness
    if (content.match(/(exercise|workout|gym|run|walk|bike|swim|yoga|pilates|sport|fitness|dance|hike|stretch|active|physical)/)) {
      tags.push('fitness');
    }

    // 🍎 Nutrition & Wellness
    if (content.match(/(meal|eat|cook|food|nutrition|diet|healthy|organic|vitamin|water|hydrate|lunch|dinner|breakfast)/)) {
      tags.push('nutrition');
    }

    // 🧠 Mental Health & Mindfulness
    if (content.match(/(meditat|mindful|therapy|mental|stress|relax|breathe|journal|gratitude|self-care|wellness)/)) {
      tags.push('mental-health');
    }

    // 💼 Career & Professional
    if (type === 'work' || content.match(/(work|job|career|meeting|project|professional|skill|training|conference|staff|business)/)) {
      tags.push('career');
    }

    // 👥 Social & Relationships
    if (content.match(/(friend|family|social|date|party|gathering|visit|call|relationship|community|people)/)) {
      tags.push('social');
    }

    // 🎨 Creative & Learning
    if (content.match(/(learn|study|read|course|creative|art|music|write|hobby|skill|practice|book|research)/)) {
      tags.push('learning');
    }

    // 🏠 Home & Organization
    if (content.match(/(clean|organize|home|house|chore|tidy|repair|garden|decorate|maintenance)/)) {
      tags.push('home');
    }

    // 💰 Financial & Planning
    if (content.match(/(budget|money|finance|invest|plan|tax|bank|save|expense|bill|financial)/)) {
      tags.push('finance');
    }

    // 🌍 Environment & Community
    if (content.match(/(volunteer|environment|community|charity|green|sustainable|recycle|nature|volunteer)/)) {
      tags.push('community');
    }

    // 🎯 Personal Goals & Growth
    if (content.match(/(goal|resolution|habit|improve|develop|challenge|achieve|progress|growth)/)) {
      tags.push('growth');
    }

    // 🎪 Fun & Entertainment
    if (content.match(/(fun|entertainment|movie|game|show|concert|festival|vacation|travel|cinema|beer)/)) {
      tags.push('entertainment');
    }

    // 😴 Rest & Recovery
    if (content.match(/(sleep|rest|nap|recover|spa|massage|vacation|break|leisure|relax)/)) {
      tags.push('rest');
    }

    // 🚗 Travel & Transportation
    if (content.match(/(travel|trip|drive|transport|car|keys|journey|commute)/)) {
      tags.push('travel');
    }

    // Default to 'general' if no specific category found
    if (tags.length === 0) {
      tags.push('general');
    }

    return tags;
  }

  getTagDisplay(tag: string): { emoji: string, label: string, color: string } {
    const tagMap: Record<string, { emoji: string, label: string, color: string }> = {
      'fitness': { emoji: '🏃‍♀️', label: 'Fitness', color: '#ef4444' },
      'nutrition': { emoji: '🍎', label: 'Nutrition', color: '#22c55e' },
      'mental-health': { emoji: '🧠', label: 'Mental Health', color: '#8b5cf6' },
      'career': { emoji: '💼', label: 'Career', color: '#3b82f6' },
      'social': { emoji: '👥', label: 'Social', color: '#f59e0b' },
      'learning': { emoji: '🎨', label: 'Learning', color: '#06b6d4' },
      'home': { emoji: '🏠', label: 'Home', color: '#84cc16' },
      'finance': { emoji: '💰', label: 'Finance', color: '#10b981' },
      'community': { emoji: '🌍', label: 'Community', color: '#14b8a6' },
      'growth': { emoji: '🎯', label: 'Growth', color: '#6366f1' },
      'entertainment': { emoji: '🎪', label: 'Fun', color: '#ec4899' },
      'rest': { emoji: '😴', label: 'Rest', color: '#64748b' },
      'travel': { emoji: '🚗', label: 'Travel', color: '#f97316' },
      'general': { emoji: '📝', label: 'General', color: '#6b7280' }
    };

    return tagMap[tag] || tagMap['general'];
  }
}