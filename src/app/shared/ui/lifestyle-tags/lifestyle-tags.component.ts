import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LIFESTYLE_TAG_COLORS, LifestyleTagConfig } from '@shared/utils/lifestyle-tags.constants';

@Component({
  selector: 'app-lifestyle-tags',
  imports: [CommonModule],
  template: `
    <div class="lifestyle-tags" [class.compact]="compact">
      @for (tag of tags; track tag) {
        <span class="lifestyle-tag" 
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
    .lifestyle-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0.5rem 0;
    }

    .lifestyle-tags.compact {
      gap: 0.125rem;
      margin: 0.25rem 0;
    }

    .lifestyle-tag {
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

    .lifestyle-tags.compact .lifestyle-tag {
      padding: 0.1rem 0.25rem;
      font-size: 0.65rem;
    }

    .lifestyle-tag:hover {
      transform: scale(1.05);
    }

    .tag-emoji {
      font-size: 0.8rem;
    }

    .lifestyle-tags.compact .tag-emoji {
      font-size: 0.7rem;
    }

    .tag-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .lifestyle-tags.compact .tag-label {
      font-size: 0.6rem;
    }
  `]
})
export class LifestyleTagsComponent {
  @Input() tags: string[] = [];
  @Input() compact = false;

  getTagDisplay(tag: string): LifestyleTagConfig {
    return LIFESTYLE_TAG_COLORS[tag] || LIFESTYLE_TAG_COLORS['general'];
  }

  // Static method to generate lifestyle tags from text content
  static generateTagsFromContent(title: string, description: string = '', eventType?: string): string[] {
    const content = `${title.toLowerCase()} ${description.toLowerCase()}`;
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
    if (eventType === 'work' || content.match(/(work|job|career|meeting|project|professional|skill|training|conference|staff|business)/)) {
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
}