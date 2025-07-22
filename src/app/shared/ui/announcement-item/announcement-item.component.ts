import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarAnnouncement } from '../../data-access/services/calendar-activity-announcer.service';

@Component({
  selector: 'app-announcement-item',
  imports: [CommonModule],
  template: `
    <div 
      class="announcement-item"
      [class]="'announcement-' + announcement.type"
      [attr.data-announcement-id]="announcement.id">
      
      <div class="announcement-icon">
        {{getTypeIcon()}}
      </div>
      
      <div class="announcement-content">
        <div class="announcement-header">
          <div class="announcement-message">
            {{announcement.message}}
          </div>
          <div class="announcement-time">
            {{formatTime(announcement.timestamp)}}
          </div>
        </div>
        
        @if (announcement.details) {
          <div class="announcement-details">
            {{announcement.details}}
          </div>
        }
        
        <div class="announcement-context">
          @if (announcement.source) {
            <span class="context-source">
              {{getSourceLabel()}}
            </span>
          }
          @if (announcement.trigger) {
            <span class="context-trigger">
              • {{getTriggerLabel()}}
            </span>
          }
          @if (announcement.reason && announcement.reason !== announcement.trigger) {
            <span class="context-reason">
              • {{announcement.reason}}
            </span>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .announcement-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.875rem;
      border-radius: 8px;
      border-left: 3px solid #cbd5e1;
      background: #f8fafc;
      animation: slideIn 0.3s ease-out;
      transition: all 0.2s ease;
    }

    .announcement-item:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .announcement-added {
      border-left-color: #10b981;
      background: #f0fdf4;
    }

    .announcement-moved {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    .announcement-rescheduled {
      border-left-color: #8b5cf6;
      background: #faf5ff;
    }

    .announcement-removed {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .announcement-updated {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }

    .announcement-icon {
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      margin-top: 0.125rem;
    }

    .announcement-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 0;
    }

    .announcement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .announcement-message {
      font-size: 0.875rem;
      font-weight: 500;
      color: #1f2937;
      line-height: 1.4;
      flex: 1;
    }

    .announcement-time {
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 400;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .announcement-details {
      font-size: 0.8125rem;
      color: #6b7280;
      line-height: 1.4;
      font-style: italic;
      padding: 0.375rem 0.5rem;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    .announcement-context {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #8b5cf6;
      line-height: 1.3;
    }

    .context-source {
      font-weight: 500;
      color: #7c3aed;
    }

    .context-trigger {
      color: #6366f1;
    }

    .context-reason {
      color: #64748b;
    }

    /* Type-specific icon colors */
    .announcement-added .announcement-icon {
      color: #10b981;
    }

    .announcement-moved .announcement-icon {
      color: #f59e0b;
    }

    .announcement-rescheduled .announcement-icon {
      color: #8b5cf6;
    }

    .announcement-removed .announcement-icon {
      color: #ef4444;
    }

    .announcement-updated .announcement-icon {
      color: #3b82f6;
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .announcement-item {
        padding: 0.625rem;
        gap: 0.5rem;
      }
      
      .announcement-header {
        flex-direction: column;
        gap: 0.25rem;
      }
      
      .announcement-message {
        font-size: 0.8125rem;
      }
      
      .announcement-context {
        font-size: 0.6875rem;
      }
    }
  `]
})
export class AnnouncementItemComponent {
  @Input() announcement!: CalendarAnnouncement;

  getTypeIcon(): string {
    switch (this.announcement.type) {
      case 'added': return '✅';
      case 'moved': return '🔄';
      case 'rescheduled': return '⚡';
      case 'removed': return '🗑️';
      case 'updated': return '🔧';
      default: return '📝';
    }
  }

  getSourceLabel(): string {
    if (!this.announcement.source) return '';
    
    switch (this.announcement.source) {
      case 'drag_drop': return 'Dragged to calendar';
      case 'form_submit': return 'Added via form';
      case 'bulk_import': return 'Bulk imported';
      case 'smart_scheduling': return 'AI scheduled';
      case 'calendar_click': return 'Calendar click';
      case 'quick_add': return 'Quick add';
      case 'template': return 'From template';
      case 'conflict_resolution': return 'Conflict resolved';
      default: return this.announcement.source;
    }
  }

  getTriggerLabel(): string {
    if (!this.announcement.trigger) return '';
    
    switch (this.announcement.trigger) {
      case 'user_action': return 'Manual';
      case 'auto_schedule': return 'Auto-scheduled';
      case 'conflict_avoid': return 'Avoiding conflict';
      case 'time_preference': return 'Time preference';
      case 'optimization': return 'Optimized';
      case 'random_placement': return 'Random placement';
      default: return this.announcement.trigger;
    }
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1m';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1h';
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return '1d';
    return `${days}d`;
  }
}