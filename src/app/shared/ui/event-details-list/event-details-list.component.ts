import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EventDetailItem {
  icon: string;
  text: string;
  type: 'date' | 'time' | 'duration' | 'location' | 'other';
}

@Component({
  selector: 'app-event-details-list',
  imports: [CommonModule],
  template: `
    <div class="event-details">
      @for (detail of details; track detail.type + detail.text) {
        <div class="detail-item" [class]="detail.type + '-detail'">
          <span class="detail-icon">{{detail.icon}}</span>
          <span class="detail-text">{{detail.text}}</span>
        </div>
      }
      
      @if (details.length === 0 && showNoDetailsMessage) {
        <div class="detail-item no-timing">
          <span class="detail-icon">⏰</span>
          <span class="detail-text">No specific time suggested</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .event-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
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
      flex-shrink: 0;
    }

    .detail-text {
      font-size: 0.85rem;
      color: #374151;
      line-height: 1.4;
    }

    .date-detail .detail-text {
      font-weight: 500;
    }

    .time-detail .detail-text {
      font-weight: 500;
      color: #1f2937;
    }

    .duration-detail .detail-text {
      color: #6b7280;
    }

    .location-detail .detail-text {
      color: #059669;
    }
  `]
})
export class EventDetailsListComponent {
  @Input() details: EventDetailItem[] = [];
  @Input() showNoDetailsMessage = true;

  // Helper methods for creating common detail items
  static createDateDetail(date: Date): EventDetailItem {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    let dateText: string;
    if (date.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateText = 'Tomorrow';
    } else {
      dateText = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }

    return {
      icon: '📅',
      text: dateText,
      type: 'date'
    };
  }

  static createTimeDetail(time: string): EventDetailItem {
    return {
      icon: '🕒',
      text: time,
      type: 'time'
    };
  }

  static createDurationDetail(minutes: number): EventDetailItem {
    const formatDuration = (minutes: number): string => {
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
    };

    return {
      icon: '⏱️',
      text: formatDuration(minutes),
      type: 'duration'
    };
  }

  static createLocationDetail(location: string): EventDetailItem {
    return {
      icon: '📍',
      text: location,
      type: 'location'
    };
  }
}