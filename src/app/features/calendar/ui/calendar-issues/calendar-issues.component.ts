import { Component, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event, RuleViolation, ValidationResult, Rule } from '../../../../shared/data-access/models/event.model';
import { CalendarService } from '../../../../shared/data-access/services/calendar.service';
import { DEFAULT_RULES } from '../../../../shared/data-access/config/default-config';

@Component({
  selector: 'app-calendar-issues',
  imports: [CommonModule],
  template: `
    <div class="issues-container" [class.has-issues]="hasIssues()">
      @if (hasIssues()) {
        <div class="issues-header">
          <div class="header-info">
            <h3 class="header-title">
              @switch (healthStatus().status) {
                @case ('critical') {
                  <span class="status-icon critical">🚨</span>
                  Schedule Issues
                }
                @case ('warning') {
                  <span class="status-icon warning">⚠️</span>
                  Schedule Warnings
                }
                @default {
                  <span class="status-icon info">💡</span>
                  Schedule Suggestions
                }
              }
            </h3>
            <div class="health-score" [class]="healthStatus().status">
              Health: {{healthStatus().score}}%
            </div>
          </div>
          <button 
            type="button" 
            class="refresh-btn"
            (click)="refreshValidation()"
            title="Refresh validation">
            🔄
          </button>
        </div>
        
        <div class="health-summary">
          {{healthStatus().summary}}
        </div>
        
        <div class="violations-list">
          @for (violation of displayedViolations(); track violation.ruleId + violation.timestamp) {
            <div class="violation-item" [class]="violation.severity">
              <div class="violation-header">
                <span class="violation-icon">
                  @switch (violation.severity) {
                    @case ('error') { ❌ }
                    @case ('warning') { ⚠️ }
                    @default { 💡 }
                  }
                </span>
                <span class="violation-rule">{{violation.ruleName}}</span>
                <span class="violation-severity">{{violation.severity}}</span>
              </div>
              
              <div class="violation-message">
                {{violation.message}}
              </div>
              
              @if (violation.eventTitles.length > 0) {
                <div class="affected-events">
                  <span class="affected-label">Affected:</span>
                  <span class="event-names">
                    {{violation.eventTitles.join(', ')}}
                  </span>
                </div>
              }
              
              @if (violation.suggestionMessage) {
                <div class="suggestion">
                  <span class="suggestion-icon">💡</span>
                  {{violation.suggestionMessage}}
                </div>
              }
              
              @if (quickFixes()[violation.ruleId]; as fixes) {
                <div class="quick-fixes">
                  <span class="fixes-label">Quick fixes:</span>
                  <ul class="fixes-list">
                    @for (fix of fixes; track fix) {
                      <li class="fix-item">{{fix}}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }
        </div>
        
        @if (totalViolations() > maxDisplayed()) {
          <div class="more-indicator">
            And {{totalViolations() - maxDisplayed()}} more issue{{totalViolations() - maxDisplayed() > 1 ? 's' : ''}}...
          </div>
        }
      } @else {
        <div class="no-issues">
          <div class="success-content">
            <span class="success-icon">✅</span>
            <h3>Schedule Valid</h3>
            <p>Your calendar looks great! No issues detected.</p>
          </div>
          <div class="health-score healthy">
            Health: {{healthStatus().score}}%
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .issues-container {
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .issues-container.has-issues {
      background: #ffffff;
      border-color: #cbd5e1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .issues-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .header-info {
      flex: 1;
    }

    .header-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .status-icon {
      font-size: 1rem;
    }

    .status-icon.critical {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .health-score {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      display: inline-block;
    }

    .health-score.healthy {
      background: #dcfce7;
      color: #166534;
    }

    .health-score.warning {
      background: #fef3c7;
      color: #92400e;
    }

    .health-score.critical {
      background: #fee2e2;
      color: #991b1b;
    }

    .refresh-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .refresh-btn:hover {
      background: #f3f4f6;
      color: #374151;
      transform: rotate(45deg);
    }

    .health-summary {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 1rem;
      font-style: italic;
    }

    .violations-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .violation-item {
      border-radius: 6px;
      padding: 0.75rem;
      border-left: 3px solid;
    }

    .violation-item.error {
      background: #fef2f2;
      border-left-color: #ef4444;
    }

    .violation-item.warning {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    .violation-item.info {
      background: #f0f9ff;
      border-left-color: #06b6d4;
    }

    .violation-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .violation-icon {
      font-size: 0.875rem;
    }

    .violation-rule {
      font-weight: 600;
      font-size: 0.875rem;
      color: #374151;
      flex: 1;
    }

    .violation-severity {
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
    }

    .violation-item.error .violation-severity {
      background: #fee2e2;
      color: #991b1b;
    }

    .violation-item.warning .violation-severity {
      background: #fef3c7;
      color: #92400e;
    }

    .violation-item.info .violation-severity {
      background: #e0f2fe;
      color: #0c4a6e;
    }

    .violation-message {
      font-size: 0.875rem;
      color: #374151;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    .affected-events {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .affected-label {
      font-weight: 500;
      margin-right: 0.25rem;
    }

    .event-names {
      font-style: italic;
    }

    .suggestion {
      font-size: 0.75rem;
      color: #059669;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
      padding: 0.5rem;
      background: #ecfdf5;
      border-radius: 4px;
    }

    .suggestion-icon {
      font-size: 0.75rem;
      margin-top: 0.125rem;
    }

    .quick-fixes {
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }

    .fixes-label {
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.25rem;
      display: block;
    }

    .fixes-list {
      margin: 0;
      padding-left: 1rem;
      color: #6b7280;
    }

    .fix-item {
      margin-bottom: 0.125rem;
      line-height: 1.3;
    }

    .more-indicator {
      text-align: center;
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.75rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .no-issues {
      text-align: center;
      color: #6b7280;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .success-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .success-icon {
      font-size: 2rem;
      opacity: 0.8;
    }

    .no-issues h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #059669;
    }

    .no-issues p {
      margin: 0;
      font-size: 0.875rem;
      font-style: italic;
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .issues-container {
        max-height: 300px;
      }
      
      .violation-header {
        flex-wrap: wrap;
      }
      
      .violation-severity {
        order: -1;
        align-self: flex-start;
      }
    }
  `]
})
export class CalendarIssuesComponent {
  private calendarService = inject(CalendarService);
  
  // Inputs
  events = input.required<Event[]>();
  customRules = input<Rule[]>();
  maxDisplayed = input<number>(5);
  
  // Internal state for forcing refresh
  private refreshTimestamp = new Date();
  
  // Computed properties
  readonly validationResult = computed(() => {
    // Force recomputation when refreshTimestamp changes
    this.refreshTimestamp;
    
    const rules = this.customRules() || DEFAULT_RULES;
    return this.calendarService.validateSchedule(this.events(), rules);
  });
  
  readonly hasIssues = computed(() => !this.validationResult().isValid);
  
  readonly displayedViolations = computed(() => 
    this.validationResult().violations.slice(0, this.maxDisplayed())
  );
  
  readonly totalViolations = computed(() => 
    this.validationResult().violations.length
  );
  
  readonly healthStatus = computed(() => {
    const rules = this.customRules() || DEFAULT_RULES;
    return this.calendarService.getScheduleHealth(this.events(), rules);
  });
  
  readonly quickFixes = computed(() => {
    const fixes: Record<string, string[]> = {};
    
    this.displayedViolations().forEach(violation => {
      if (!fixes[violation.ruleId]) {
        fixes[violation.ruleId] = this.calendarService.generateQuickFix(violation, this.events());
      }
    });
    
    return fixes;
  });
  
  refreshValidation(): void {
    this.refreshTimestamp = new Date();
  }
}