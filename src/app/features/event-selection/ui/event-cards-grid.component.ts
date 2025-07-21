import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCard } from '@shared/data-access/models/event.model';
import { EventCardComponent } from './event-card.component';

@Component({
  selector: 'app-event-cards-grid',
  imports: [CommonModule, EventCardComponent],
  template: `
    <div class="cards-container">
      <div class="cards-header">
        <h3>Generated Event Options</h3>
        <p>Select the event that best matches what you had in mind:</p>
      </div>
      
      <div class="cards-grid" [class.single-card]="cards.length === 1">
        @for (card of cards; track card.id) {
          <app-event-card
            [card]="card"
            [isSelected]="card.id === selectedCardId"
            (cardClick)="onCardClick(card)"
            (customizeClick)="onCustomizeClick(card)"
            (deleteClick)="onDeleteClick(card)"
            (dragStart)="onCardDragStart($event)"
            (dragEnd)="onCardDragEnd($event)"
            (titleEdit)="onCardTitleEdit($event)"
            (descriptionEdit)="onCardDescriptionEdit($event)">
          </app-event-card>
        }
      </div>
      
      @if (cards.length > 1) {
        <div class="selection-help">
          <p><strong>Tip:</strong> Click on the event card that best represents what you want to add to your calendar.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .cards-container {
      margin: 2rem 0;
    }

    .cards-header {
      margin-bottom: 1.5rem;
    }

    .cards-header h3 {
      color: #1f2937;
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
    }

    .cards-header p {
      color: #6b7280;
      margin: 0;
    }

    .cards-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .cards-grid.single-card {
      grid-template-columns: 1fr;
      max-width: 600px;
      margin: 0 auto;
    }

    .selection-help {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f0f9ff;
      border-radius: 8px;
      border: 1px solid #bae6fd;
      text-align: center;
    }

    .selection-help p {
      margin: 0;
      color: #0c4a6e;
      font-size: 0.9rem;
    }

    .selection-help strong {
      color: #075985;
    }

    @media (max-width: 768px) {
      .cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class EventCardsGridComponent {
  @Input() cards: EventCard[] = [];
  @Input() selectedCardId: string | null = null;

  @Output() cardSelected = new EventEmitter<EventCard>();
  @Output() cardCustomize = new EventEmitter<EventCard>();
  @Output() cardDelete = new EventEmitter<EventCard>();
  @Output() cardDragStart = new EventEmitter<{card: EventCard}>();
  @Output() cardDragEnd = new EventEmitter<{card: EventCard}>();
  @Output() cardTitleEdit = new EventEmitter<{card: EventCard, newTitle: string}>();
  @Output() cardDescriptionEdit = new EventEmitter<{card: EventCard, newDescription: string}>();

  onCardClick(card: EventCard): void {
    this.cardSelected.emit(card);
  }

  onCustomizeClick(card: EventCard): void {
    this.cardCustomize.emit(card);
  }

  onDeleteClick(card: EventCard): void {
    this.cardDelete.emit(card);
  }

  onCardDragStart(event: {card: EventCard}): void {
    this.cardDragStart.emit(event);
  }

  onCardDragEnd(event: {card: EventCard}): void {
    this.cardDragEnd.emit(event);
  }

  onCardTitleEdit(event: {card: EventCard, newTitle: string}): void {
    this.cardTitleEdit.emit(event);
  }

  onCardDescriptionEdit(event: {card: EventCard, newDescription: string}): void {
    this.cardDescriptionEdit.emit(event);
  }
}