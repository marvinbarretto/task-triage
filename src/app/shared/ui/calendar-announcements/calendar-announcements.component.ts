import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarActivityAnnouncerService, CalendarAnnouncement } from '../../data-access/services/calendar-activity-announcer.service';
import { effect, computed } from '@angular/core';

@Component({
  selector: 'app-calendar-announcements',
  imports: [CommonModule],
  template: `
    <div class="announcements-container" [class.has-announcements]="hasAnnouncements()">
      @if (hasAnnouncements()) {
        <div class="announcements-header">
          <h3>📢 Recent Activity</h3>
          <button 
            type="button" 
            class="clear-btn"
            (click)="clearAnnouncements()"
            title="Clear all announcements">
            ✕
          </button>
        </div>
        
        <div class="announcements-list">
          @for (announcement of displayedAnnouncements(); track announcement.id) {
            <div 
              class="announcement"
              [class]="'announcement-' + announcement.type"
              [attr.data-announcement-id]="announcement.id">
              
              <div class="announcement-content">
                <div class="announcement-message">
                  {{announcement.message}}
                </div>
                
                @if (announcement.details) {
                  <div class="announcement-details">
                    {{announcement.details}}
                  </div>
                }
                
                <div class="announcement-time">
                  {{formatTime(announcement.timestamp)}}
                </div>
              </div>
            </div>
          }
        </div>
        
        @if (totalAnnouncements() > maxDisplayed) {
          <div class="more-indicator">
            And {{totalAnnouncements() - maxDisplayed}} more activities...
          </div>
        }
      } @else {
        <div class="no-announcements">
          <span class="quiet-icon">📝</span>
          <p>Calendar activity will appear here</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .announcements-container {
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 1rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .announcements-container.has-announcements {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .announcements-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .announcements-header h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .announcements-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .announcement {
      padding: 0.75rem;
      border-radius: 6px;
      border-left: 3px solid #cbd5e1;
      background: #f8fafc;
      animation: slideIn 0.3s ease-out;
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

    .announcement-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .announcement-message {
      font-size: 0.875rem;
      font-weight: 500;
      color: #1f2937;
      line-height: 1.4;
    }

    .announcement-details {
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.3;
    }

    .announcement-time {
      font-size: 0.75rem;
      color: #9ca3af;
      font-weight: 400;
    }

    .more-indicator {
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .no-announcements {
      text-align: center;
      color: #6b7280;
      padding: 1rem;
    }

    .quiet-icon {
      font-size: 1.5rem;
      opacity: 0.5;
      display: block;
      margin-bottom: 0.5rem;
    }

    .no-announcements p {
      margin: 0;
      font-size: 0.875rem;
      font-style: italic;
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .announcements-container {
        max-height: 200px;
      }
      
      .announcement {
        padding: 0.5rem;
      }
      
      .announcement-message {
        font-size: 0.8rem;
      }
    }
  `]
})
export class CalendarAnnouncementsComponent implements OnInit, OnDestroy {
  private announcerService = inject(CalendarActivityAnnouncerService);
  
  // Configuration
  readonly maxDisplayed = 5;
  
  // Computed signals
  readonly allAnnouncements = this.announcerService.recentAnnouncements;
  readonly displayedAnnouncements = computed(() => 
    this.announcerService.getRecentAnnouncements(this.maxDisplayed)
  );
  readonly totalAnnouncements = computed(() => this.allAnnouncements().length);
  readonly hasAnnouncements = computed(() => this.totalAnnouncements() > 0);

  constructor() {
    // Auto-scroll to bottom when new announcements arrive
    effect(() => {
      if (this.hasAnnouncements()) {
        setTimeout(() => this.scrollToLatest(), 100);
      }
    });
  }

  ngOnInit(): void {
    console.log('[CalendarAnnouncements] Component initialized');
  }

  ngOnDestroy(): void {
    console.log('[CalendarAnnouncements] Component destroyed');
  }

  clearAnnouncements(): void {
    this.announcerService.clearAnnouncements();
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    return timestamp.toLocaleDateString();
  }

  private scrollToLatest(): void {
    const container = document.querySelector('.announcements-container');
    if (container) {
      container.scrollTop = 0; // Scroll to top since newest are first
    }
  }
}