import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event } from '@shared/data-access/models/event.model';
import { EventTypeBadgeComponent } from '@shared/ui/event-type-badge/event-type-badge.component';
import { EventDetailsListComponent, EventDetailItem } from '@shared/ui/event-details-list/event-details-list.component';
import { EventTagsComponent } from '@shared/ui/event-tags/event-tags.component';
import { EventTagsService } from '@shared/data-access/services/event-tags.service';

@Component({
  selector: 'app-event-details-overlay',
  imports: [CommonModule, EventTypeBadgeComponent, EventDetailsListComponent, EventTagsComponent],
  template: `
    @if (isVisible && event) {
      <div class="overlay-backdrop" (click)="onBackdropClick($event)">
        <div class="overlay-content" (click)="$event.stopPropagation()">
          <div class="overlay-header">
            <h3 class="event-title">{{event.title}}</h3>
            <button 
              type="button" 
              class="close-btn"
              (click)="onClose()"
              title="Close">
              ×
            </button>
          </div>
          
          <div class="overlay-body">
            <div class="event-type-section">
              <app-event-type-badge [type]="event.type"></app-event-type-badge>
            </div>
            
            @if (event.description) {
              <div class="description-section">
                <p class="event-description">{{event.description}}</p>
              </div>
            }
            
            <div class="details-section">
              <app-event-details-list [details]="getEventDetails()"></app-event-details-list>
            </div>
            
            <div class="tags-section">
              <app-event-tags 
                [tags]="eventTags()" 
                [compact]="false">
              </app-event-tags>
            </div>
            
            <div class="metadata-section">
              <div class="metadata-item">
                <span class="metadata-label">Created:</span>
                <span class="metadata-value">{{formatDateTime(event.createdAt)}}</span>
              </div>
              @if (event.updatedAt && event.updatedAt !== event.createdAt) {
                <div class="metadata-item">
                  <span class="metadata-label">Updated:</span>
                  <span class="metadata-value">{{formatDateTime(event.updatedAt)}}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .overlay-content {
      background: white;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .overlay-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 1.5rem 0 1.5rem;
      gap: 1rem;
    }

    .event-title {
      margin: 0;
      color: #1f2937;
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.3;
      flex: 1;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: #f3f4f6;
      color: #6b7280;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      line-height: 1;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: #fee2e2;
      color: #dc2626;
      transform: scale(1.1);
    }

    .overlay-body {
      padding: 1.5rem;
      padding-top: 1rem;
    }

    .event-type-section {
      margin-bottom: 1rem;
    }

    .description-section {
      margin-bottom: 1rem;
    }

    .event-description {
      margin: 0;
      color: #4b5563;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .details-section {
      margin-bottom: 1rem;
    }

    .tags-section {
      margin-bottom: 1rem;
    }

    .metadata-section {
      border-top: 1px solid #f3f4f6;
      padding-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metadata-label {
      font-size: 0.8rem;
      color: #6b7280;
      font-weight: 500;
    }

    .metadata-value {
      font-size: 0.8rem;
      color: #374151;
    }

    @media (max-width: 640px) {
      .overlay-backdrop {
        padding: 0.5rem;
      }
      
      .overlay-content {
        border-radius: 8px;
        max-height: 95vh;
      }
      
      .overlay-header {
        padding: 1rem 1rem 0 1rem;
      }
      
      .overlay-body {
        padding: 1rem;
        padding-top: 0.75rem;
      }
      
      .event-title {
        font-size: 1.1rem;
      }
    }
  `]
})
export class EventDetailsOverlayComponent implements OnInit, OnChanges {
  @Input() event: Event | null = null;
  @Input() isVisible = false;

  private eventTagsService = inject(EventTagsService);
  eventTags = signal<string[]>([]);
  
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    // Close if clicking directly on backdrop (not on content)
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  getEventDetails(): EventDetailItem[] {
    if (!this.event) return [];

    const details: EventDetailItem[] = [];

    // Add date detail
    details.push(EventDetailsListComponent.createDateDetail(this.event.startDate));

    // Add time detail if not all-day
    if (!this.event.isAllDay && this.event.startTime) {
      details.push(EventDetailsListComponent.createTimeDetail(this.event.startTime));
    } else if (!this.event.isAllDay) {
      // Extract time from startDate if startTime is not available
      const timeString = this.event.startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      details.push(EventDetailsListComponent.createTimeDetail(timeString));
    }

    // Add duration detail if we can calculate it
    if (this.event.endDate && !this.event.isAllDay) {
      const durationMs = this.event.endDate.getTime() - this.event.startDate.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      if (durationMinutes > 0) {
        details.push(EventDetailsListComponent.createDurationDetail(durationMinutes));
      }
    }

    // Add location detail if available
    if (this.event.location) {
      details.push(EventDetailsListComponent.createLocationDetail(this.event.location));
    }

    return details;
  }

  async ngOnInit() {
    await this.loadEventTags();
  }

  async ngOnChanges(changes: SimpleChanges) {
    // Reload tags when event data changes
    if (changes['event'] && this.event) {
      await this.loadEventTags();
    }
  }

  private async loadEventTags() {
    if (!this.event) {
      this.eventTags.set([]);
      return;
    }
    
    try {
      const tags = await this.eventTagsService.generateTagsFromContent(
        this.event.title,
        this.event.description || '',
        this.event.type
      );
      this.eventTags.set(tags);
    } catch (error) {
      console.warn('[EventDetailsOverlayComponent] Failed to generate tags, using fallback:', error);
      this.eventTags.set(['general']);
    }
  }

  formatDateTime(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}