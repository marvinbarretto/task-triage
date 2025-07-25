import { Component, inject, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rule, RuleCategory, RuleSeverity } from '../../../../shared/data-access/models/event.model';
import { DEFAULT_RULES } from '../../../../shared/data-access/config/default-config';

@Component({
  selector: 'app-rules-settings',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rules-settings-container">
      <div class="settings-header">
        <h3>Schedule Validation Rules</h3>
        <div class="header-actions">
          <button 
            class="reset-btn"
            (click)="resetToDefaults()"
            title="Reset to default settings">
            🔄 Reset
          </button>
          <button 
            class="close-btn"
            (click)="closeSettings()"
            title="Close settings">
            ✕
          </button>
        </div>
      </div>
      
      <div class="settings-summary">
        <div class="summary-item">
          <span class="summary-label">Active Rules:</span>
          <span class="summary-value">{{enabledRulesCount()}} of {{totalRulesCount()}}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Auto Validation:</span>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              [checked]="autoValidation()" 
              (change)="setAutoValidationFromEvent($event)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Rules by Category -->
      @for (category of ruleCategories(); track category) {
        <div class="category-section">
          <div class="category-header">
            <h4 class="category-title">
              <span class="category-icon">{{getCategoryIcon(category)}}</span>
              {{getCategoryName(category)}}
            </h4>
            <div class="category-stats">
              {{getCategoryEnabledCount(category)}} / {{getCategoryTotalCount(category)}} enabled
            </div>
          </div>
          
          <div class="rules-list">
            @for (rule of getRulesForCategory(category); track rule.id) {
              <div class="rule-item" [class.disabled]="!isRuleEnabled(rule.id)">
                <div class="rule-header">
                  <label class="rule-toggle">
                    <input 
                      type="checkbox" 
                      [checked]="isRuleEnabled(rule.id)"
                      (change)="toggleRuleFromEvent(rule.id, $event)">
                    <span class="rule-name">{{rule.name}}</span>
                  </label>
                  
                  <div class="rule-severity">
                    <select 
                      [value]="getRuleSeverity(rule.id)" 
                      (change)="updateRuleSeverityFromEvent(rule.id, $event)"
                      [disabled]="!isRuleEnabled(rule.id)"
                      class="severity-select">
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
                
                <div class="rule-description">
                  {{rule.description}}
                </div>
                
                <!-- Rule-specific settings -->
                @if (isRuleEnabled(rule.id)) {
                  @switch (rule.id) {
                    @case ('meeting_buffer') {
                      <div class="rule-settings">
                        <label class="setting-label">
                          Buffer Time (minutes):
                          <input 
                            type="number" 
                            min="5" 
                            max="60" 
                            [value]="getRuleSetting(rule.id, 'bufferMinutes')"
                            (change)="updateRuleSettingFromEvent(rule.id, 'bufferMinutes', $event)"
                            class="number-input">
                        </label>
                      </div>
                    }
                    @case ('workload_limit') {
                      <div class="rule-settings">
                        <label class="setting-label">
                          Max Events Per Day:
                          <input 
                            type="number" 
                            min="3" 
                            max="20" 
                            [value]="getRuleSetting(rule.id, 'maxEventsPerDay')"
                            (change)="updateRuleSettingFromEvent(rule.id, 'maxEventsPerDay', $event)"
                            class="number-input">
                        </label>
                      </div>
                    }
                    @case ('duration_validation') {
                      <div class="rule-settings">
                        <label class="setting-label">
                          Min Duration (minutes):
                          <input 
                            type="number" 
                            min="1" 
                            max="60" 
                            [value]="getRuleSetting(rule.id, 'minDurationMinutes')"
                            (change)="updateRuleSettingFromEvent(rule.id, 'minDurationMinutes', $event)"
                            class="number-input">
                        </label>
                        <label class="setting-label">
                          Max Duration (hours):
                          <input 
                            type="number" 
                            min="1" 
                            max="12" 
                            [value]="getRuleSetting(rule.id, 'maxDurationMinutes') / 60"
                            (change)="updateRuleSettingHours(rule.id, 'maxDurationMinutes', $event)"
                            class="number-input">
                        </label>
                      </div>
                    }
                    @case ('location_grouping') {
                      <div class="rule-settings">
                        <label class="setting-label">
                          Max Gap Between Same Location (hours):
                          <input 
                            type="number" 
                            min="1" 
                            max="8" 
                            [value]="getRuleSetting(rule.id, 'maxGapMinutes') / 60"
                            (change)="updateRuleSettingHours(rule.id, 'maxGapMinutes', $event)"
                            class="number-input">
                        </label>
                      </div>
                    }
                    @case ('break_requirement') {
                      <div class="rule-settings">
                        <label class="setting-label">
                          Work Hours Before Break:
                          <input 
                            type="number" 
                            min="2" 
                            max="8" 
                            [value]="getRuleSetting(rule.id, 'workHoursThreshold') / 60"
                            (change)="updateRuleSettingHours(rule.id, 'workHoursThreshold', $event)"
                            class="number-input">
                        </label>
                        <label class="setting-label">
                          Required Break (minutes):
                          <input 
                            type="number" 
                            min="15" 
                            max="120" 
                            [value]="getRuleSetting(rule.id, 'requiredBreakMinutes')"
                            (change)="updateRuleSettingFromEvent(rule.id, 'requiredBreakMinutes', $event)"
                            class="number-input">
                        </label>
                      </div>
                    }
                  }
                }
              </div>
            }
          </div>
        </div>
      }
      
      <div class="settings-actions">
        <button class="apply-btn" (click)="applySettings()">
          Apply Changes
        </button>
        <button class="cancel-btn" (click)="cancelChanges()">
          Cancel
        </button>
      </div>
    </div>
  `,
  styles: [`
    .rules-settings-container {
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      max-height: 600px;
      overflow-y: auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 8px 8px 0 0;
    }

    .settings-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .reset-btn, .close-btn {
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .reset-btn {
      color: #6b7280;
    }

    .reset-btn:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .close-btn {
      color: #ef4444;
      border-color: #ef4444;
    }

    .close-btn:hover {
      background: #fee2e2;
    }

    .settings-summary {
      padding: 1rem 1.25rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .summary-label {
      color: #6b7280;
      font-weight: 500;
    }

    .summary-value {
      color: #374151;
      font-weight: 600;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: 0.2s;
      border-radius: 20px;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    input:checked + .toggle-slider {
      background-color: #10b981;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    .category-section {
      border-bottom: 1px solid #e5e7eb;
    }

    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem 0.5rem;
    }

    .category-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .category-icon {
      font-size: 1rem;
    }

    .category-stats {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .rules-list {
      padding: 0 1.25rem 1rem;
    }

    .rule-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 0.75rem;
      transition: all 0.2s ease;
    }

    .rule-item:last-child {
      margin-bottom: 0;
    }

    .rule-item.disabled {
      opacity: 0.6;
      background: #f9fafb;
    }

    .rule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .rule-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      flex: 1;
    }

    .rule-toggle input {
      margin: 0;
    }

    .rule-name {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .severity-select {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.75rem;
      background: white;
      color: #374151;
    }

    .severity-select:disabled {
      background: #f3f4f6;
      color: #9ca3af;
    }

    .rule-description {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      color: #6b7280;
      line-height: 1.4;
    }

    .rule-settings {
      padding: 0.75rem;
      background: #f8fafc;
      border-top: 1px solid #f3f4f6;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .setting-label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: #374151;
      font-weight: 500;
      min-width: 120px;
    }

    .number-input {
      padding: 0.25rem 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.75rem;
      width: 80px;
    }

    .settings-actions {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 8px 8px;
      justify-content: flex-end;
    }

    .apply-btn {
      background: #10b981;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .apply-btn:hover {
      background: #059669;
    }

    .cancel-btn {
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .cancel-btn:hover {
      background: #4b5563;
    }

    /* Mobile responsiveness */
    @media (max-width: 640px) {
      .settings-summary {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }
      
      .rule-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .rule-settings {
        flex-direction: column;
      }
      
      .settings-actions {
        flex-direction: column;
      }
    }
  `]
})
export class RulesSettingsComponent {
  // Internal state
  private rulesSignal = signal<Rule[]>(DEFAULT_RULES.map(rule => ({ ...rule })));
  private autoValidationSignal = signal<boolean>(true);
  private enabledRulesSignal = signal<Set<string>>(new Set(['time_conflict', 'meeting_buffer', 'workload_limit', 'duration_validation']));
  private ruleSettingsSignal = signal<Record<string, Record<string, any>>>({
    meeting_buffer: { bufferMinutes: 10 },
    workload_limit: { maxEventsPerDay: 8 },
    duration_validation: { minDurationMinutes: 5, maxDurationMinutes: 480 },
    location_grouping: { maxGapMinutes: 180 },
    break_requirement: { workHoursThreshold: 240, requiredBreakMinutes: 30 }
  });

  // Output events
  rulesChanged = output<{ rules: Rule[]; enabledRules: string[]; settings: Record<string, any> }>();
  settingsClosed = output<void>();
  result = output<{ rules: Rule[]; enabledRules: string[]; settings: Record<string, any> } | null>();

  // Computed properties
  readonly rules = computed(() => this.rulesSignal());
  readonly autoValidation = computed(() => this.autoValidationSignal());
  readonly enabledRules = computed(() => this.enabledRulesSignal());
  readonly ruleSettings = computed(() => this.ruleSettingsSignal());
  
  readonly ruleCategories = computed(() => {
    const categories = new Set<RuleCategory>();
    this.rules().forEach(rule => categories.add(rule.category));
    return Array.from(categories);
  });
  
  readonly enabledRulesCount = computed(() => this.enabledRules().size);
  readonly totalRulesCount = computed(() => this.rules().length);

  // Actions
  toggleRule(ruleId: string, enabled: boolean): void {
    const updated = new Set(this.enabledRules());
    if (enabled) {
      updated.add(ruleId);
    } else {
      updated.delete(ruleId);
    }
    this.enabledRulesSignal.set(updated);
  }

  updateRuleSeverity(ruleId: string, severity: string): void {
    const rules = this.rules().map(rule => 
      rule.id === ruleId ? { ...rule, severity: severity as RuleSeverity } : rule
    );
    this.rulesSignal.set(rules);
  }

  updateRuleSetting(ruleId: string, setting: string, value: any): void {
    const settings = { ...this.ruleSettings() };
    if (!settings[ruleId]) {
      settings[ruleId] = {};
    }
    settings[ruleId] = { ...settings[ruleId], [setting]: value };
    this.ruleSettingsSignal.set(settings);
  }

  setAutoValidation(enabled: boolean): void {
    this.autoValidationSignal.set(enabled);
  }

  resetToDefaults(): void {
    this.rulesSignal.set(DEFAULT_RULES.map(rule => ({ ...rule })));
    this.enabledRulesSignal.set(new Set(['time_conflict', 'meeting_buffer', 'workload_limit', 'duration_validation']));
    this.ruleSettingsSignal.set({
      meeting_buffer: { bufferMinutes: 10 },
      workload_limit: { maxEventsPerDay: 8 },
      duration_validation: { minDurationMinutes: 5, maxDurationMinutes: 480 },
      location_grouping: { maxGapMinutes: 180 },
      break_requirement: { workHoursThreshold: 240, requiredBreakMinutes: 30 }
    });
    this.autoValidationSignal.set(true);
  }

  applySettings(): void {
    // Update rules with current settings and enabled state
    const updatedRules = this.rules().map(rule => ({
      ...rule,
      isEnabled: this.enabledRules().has(rule.id),
      condition: {
        ...rule.condition,
        parameters: {
          ...rule.condition.parameters,
          ...this.ruleSettings()[rule.id] || {}
        }
      }
    }));

    const config = {
      rules: updatedRules,
      enabledRules: Array.from(this.enabledRules()),
      settings: this.ruleSettings()
    };

    this.rulesChanged.emit(config);
    this.result.emit(config);
  }

  cancelChanges(): void {
    this.settingsClosed.emit();
    this.result.emit(null);
  }

  closeSettings(): void {
    this.settingsClosed.emit();
    this.result.emit(null);
  }

  // Helper methods
  isRuleEnabled(ruleId: string): boolean {
    return this.enabledRules().has(ruleId);
  }

  getRuleSeverity(ruleId: string): RuleSeverity {
    return this.rules().find(rule => rule.id === ruleId)?.severity || 'warning';
  }

  getRuleSetting(ruleId: string, setting: string): any {
    return this.ruleSettings()[ruleId]?.[setting] || 0;
  }

  getRulesForCategory(category: RuleCategory): Rule[] {
    return this.rules().filter(rule => rule.category === category);
  }

  getCategoryEnabledCount(category: RuleCategory): number {
    return this.getRulesForCategory(category).filter(rule => this.enabledRules().has(rule.id)).length;
  }

  getCategoryTotalCount(category: RuleCategory): number {
    return this.getRulesForCategory(category).length;
  }

  getCategoryName(category: RuleCategory): string {
    const names: Record<RuleCategory, string> = {
      'time': 'Time Management',
      'location': 'Location Optimization',
      'workload': 'Workload Management',
      'breaks': 'Break Requirements',
      'conflicts': 'Conflict Detection',
      'duration': 'Duration Validation'
    };
    return names[category] || category;
  }

  getCategoryIcon(category: RuleCategory): string {
    const icons: Record<RuleCategory, string> = {
      'time': '⏰',
      'location': '📍',
      'workload': '📊',
      'breaks': '☕',
      'conflicts': '⚠️',
      'duration': '⏱️'
    };
    return icons[category] || '⚙️';
  }

  // Helper methods for event handling
  updateRuleSettingFromEvent(ruleId: string, setting: string, event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.updateRuleSetting(ruleId, setting, value);
  }

  updateRuleSettingHours(ruleId: string, setting: string, event: Event): void {
    const hours = +(event.target as HTMLInputElement).value;
    const minutes = hours * 60;
    this.updateRuleSetting(ruleId, setting, minutes);
  }

  toggleRuleFromEvent(ruleId: string, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.toggleRule(ruleId, enabled);
  }

  setAutoValidationFromEvent(event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;
    this.setAutoValidation(enabled);
  }

  updateRuleSeverityFromEvent(ruleId: string, event: Event): void {
    const severity = (event.target as HTMLSelectElement).value;
    this.updateRuleSeverity(ruleId, severity);
  }
}