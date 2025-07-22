import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarActivityAnnouncerService, CalendarAnnouncement } from '../../data-access/services/calendar-activity-announcer.service';
import { AnnouncementItemComponent } from '../announcement-item/announcement-item.component';
import { effect, computed } from '@angular/core';

@Component({
  selector: 'app-calendar-announcements',
  imports: [CommonModule, AnnouncementItemComponent],
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
            <app-announcement-item 
              [announcement]="announcement">
            </app-announcement-item>
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
      gap: 0.625rem;
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


  private scrollToLatest(): void {
    const container = document.querySelector('.announcements-container');
    if (container) {
      container.scrollTop = 0; // Scroll to top since newest are first
    }
  }
}