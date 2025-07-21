import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventType } from '@shared/data-access/models/event.model';

@Component({
  selector: 'app-event-type-badge',
  imports: [CommonModule],
  template: `
    <div class="event-type">
      <span class="type-icon">{{getTypeIcon(type)}}</span>
      <span class="type-label">{{getTypeLabel(type)}}</span>
    </div>
  `,
  styles: [`
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
  `]
})
export class EventTypeBadgeComponent {
  @Input() type: EventType = 'task';

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
}