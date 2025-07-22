import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EVENT_TAG_COLORS, EventTagConfig } from '@shared/utils/event-tags.constants';
import { EventTagsService } from '@shared/data-access/services/event-tags.service';

@Component({
  selector: 'app-event-tags',
  imports: [CommonModule],
  template: `
    <div class="event-tags" [class.compact]="compact">
      @for (tag of tags; track tag) {
        <span class="event-tag" 
              [style.background-color]="getTagDisplay(tag).color + '20'"
              [style.border-color]="getTagDisplay(tag).color"
              [style.color]="getTagDisplay(tag).color">
          <span class="tag-emoji">{{getTagDisplay(tag).emoji}}</span>
          <span class="tag-label">{{getTagDisplay(tag).label}}</span>
        </span>
      }
    </div>
  `,
  styles: [`
    .event-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.5rem 0;
    }

    .event-tags.compact {
      gap: 0.125rem;
      margin: 0.25rem 0;
    }

    .event-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 500;
      transition: transform 0.2s ease;
    }

    .event-tags.compact .event-tag {
      padding: 0.1rem 0.25rem;
      font-size: 0.65rem;
    }

    .event-tag:hover {
      transform: scale(1.05);
    }

    .tag-emoji {
      font-size: 0.8rem;
    }

    .event-tags.compact .tag-emoji {
      font-size: 0.7rem;
    }

    .tag-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .event-tags.compact .tag-label {
      font-size: 0.6rem;
    }
  `]
})
export class EventTagsComponent {
  @Input() tags: string[] = [];
  @Input() compact = false;

  private eventTagsService = inject(EventTagsService);

  getTagDisplay(tag: string): EventTagConfig {
    return EVENT_TAG_COLORS[tag] || EVENT_TAG_COLORS['general'];
  }

  // Service-based tag generation (async, uses LLM)
  async generateTagsFromContent(title: string, description: string = '', eventType?: string): Promise<string[]> {
    return this.eventTagsService.generateTagsFromContent(title, description, eventType);
  }
}