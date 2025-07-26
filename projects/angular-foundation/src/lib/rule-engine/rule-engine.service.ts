/**
 * Generic item interface for rule validation
 * Your domain models should implement this interface
 */
export interface ValidatableItem {
  id: string;
  title?: string;
  startDate?: Date;
  endDate?: Date;
  durationMinutes?: number;
  location?: string;
  type?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Rule condition configuration
 */
export interface RuleCondition {
  type: string;
  parameters: Record<string, any>;
}

/**
 * Rule severity levels
 */
export type RuleSeverity = 'info' | 'warning' | 'error';

/**
 * Rule categories for organization
 */
export type RuleCategory = 'time' | 'location' | 'workload' | 'breaks' | 'conflicts' | 'duration' | 'custom';

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  isEnabled: boolean;
  severity: RuleSeverity;
  condition: RuleCondition;
  message: string;
  suggestionMessage?: string;
}

/**
 * Rule violation result
 */
export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: RuleSeverity;
  message: string;
  suggestionMessage?: string;
  affectedItems: string[];
  itemTitles: string[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Validation result containing all violations and suggestions
 */
export interface ValidationResult {
  isValid: boolean;
  violations: RuleViolation[];
  suggestions: string[];
  validatedAt: Date;
  itemCount: number;
  ruleCount: number;
}

/**
 * Time gap analysis result
 */
export interface TimeGap {
  beforeItem: ValidatableItem;
  afterItem: ValidatableItem;
  gapMinutes: number;
}

/**
 * Generic Rule Engine for Angular Applications
 * 
 * Provides a comprehensive rule-based validation system for any collection of items.
 * Perfect for validating:
 * - Calendar events and scheduling conflicts
 * - Task lists and workload management  
 * - Business rules and constraints
 * - Data integrity and consistency
 * - Resource allocation and limits
 * - Time-based workflows
 * 
 * @example
 * // Define rules for calendar events
 * const rules: ValidationRule[] = [
 *   {
 *     id: 'no_overlap',
 *     name: 'No Overlapping Events',
 *     category: 'conflicts',
 *     severity: 'error',
 *     isEnabled: true,
 *     condition: { type: 'time_conflict', parameters: {} },
 *     message: 'Events cannot overlap',
 *     suggestionMessage: 'Reschedule one of the conflicting events'
 *   }
 * ];
 * 
 * @example  
 * // Validate events
 * const engine = new RuleEngine();
 * const result = engine.validateItems(events, rules);
 * if (!result.isValid) {
 *   console.log(`Found ${result.violations.length} violations`);
 *   result.violations.forEach(v => console.log(v.message));
 * }
 * 
 * @example
 * // Register custom rule validators
 * engine.registerRuleValidator('custom_rule', (items, rule) => {
 *   // Custom validation logic
 *   return violations;
 * });
 * 
 * Use Cases:
 * - Calendar event validation
 * - Task scheduling and workload limits
 * - Meeting room booking conflicts
 * - Resource allocation constraints  
 * - Business rule enforcement
 * - Data quality validation
 * - Workflow step validation
 * - Compliance checking
 * - Performance optimization rules
 * - User behavior pattern validation
 */
export class RuleEngine {
  private customValidators = new Map<string, RuleValidator>();

  /**
   * Custom rule validator function type
   */
  private ruleValidators: Map<string, RuleValidator> = new Map([
    ['time_conflict', this.validateTimeConflicts.bind(this)],
    ['meeting_buffer', this.validateMeetingBuffer.bind(this)],
    ['location_grouping', this.validateLocationGrouping.bind(this)],
    ['workload_limit', this.validateWorkloadLimit.bind(this)],
    ['duration_validation', this.validateDuration.bind(this)],
    ['break_requirement', this.validateBreakRequirement.bind(this)]
  ]);

  /**
   * Validate a collection of items against all enabled rules
   * @param items Items to validate (events, tasks, etc.)
   * @param rules Validation rules to apply
   * @returns Comprehensive validation result
   * 
   * @example
   * const result = engine.validateItems(events, rules);
   * if (!result.isValid) {
   *   console.log('Validation failed:', result.violations);
   * }
   */
  validateItems<T extends ValidatableItem>(items: T[], rules: ValidationRule[]): ValidationResult {
    const violations: RuleViolation[] = [];
    const enabledRules = rules.filter(rule => rule.isEnabled);
    
    for (const rule of enabledRules) {
      const ruleViolations = this.validateRule(items, rule);
      violations.push(...ruleViolations);
    }
    
    return {
      isValid: violations.length === 0,
      violations: violations.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      suggestions: this.generateSuggestions(violations),
      validatedAt: new Date(),
      itemCount: items.length,
      ruleCount: enabledRules.length
    };
  }

  /**
   * Register a custom rule validator
   * @param ruleType Rule condition type to handle
   * @param validator Function that validates items for this rule type
   * 
   * @example
   * engine.registerRuleValidator('custom_budget_check', (items, rule) => {
   *   const violations: RuleViolation[] = [];
   *   // Custom validation logic here
   *   return violations;
   * });
   */
  registerRuleValidator(ruleType: string, validator: RuleValidator): void {
    this.ruleValidators.set(ruleType, validator);
  }

  /**
   * Get violation statistics by severity and category
   * @param result Validation result to analyze
   * @returns Statistical breakdown of violations
   * 
   * @example
   * const stats = engine.getViolationStats(result);
   * console.log(`${stats.errorCount} errors, ${stats.warningCount} warnings`);
   */
  getViolationStats(result: ValidationResult) {
    const stats = {
      totalViolations: result.violations.length,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      byCategory: {} as Record<string, number>,
      mostCommonRule: '',
      affectedItemCount: new Set<string>()
    };

    result.violations.forEach(violation => {
      // Count by severity
      switch (violation.severity) {
        case 'error': stats.errorCount++; break;
        case 'warning': stats.warningCount++; break;
        case 'info': stats.infoCount++; break;
      }

      // Count affected items
      violation.affectedItems.forEach(id => stats.affectedItemCount.add(id));
    });

    // Find most common rule
    const ruleCounts = result.violations.reduce((counts, v) => {
      counts[v.ruleId] = (counts[v.ruleId] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    stats.mostCommonRule = Object.entries(ruleCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    return {
      ...stats,
      affectedItemCount: stats.affectedItemCount.size
    };
  }

  // ========================================
  // PRIVATE VALIDATION METHODS
  // ========================================

  private validateRule<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const validator = this.ruleValidators.get(rule.condition.type);
    
    if (!validator) {
      console.warn(`Unknown rule condition type: ${rule.condition.type}`);
      return [];
    }

    return validator(items, rule);
  }

  private validateTimeConflicts<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const itemsWithTime = items.filter(item => item.startDate);
    const sortedItems = itemsWithTime.sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
    
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const currentItem = sortedItems[i];
      const nextItem = sortedItems[i + 1];
      
      if (this.itemsOverlap(currentItem, nextItem)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${currentItem.title || currentItem.id}" overlaps with "${nextItem.title || nextItem.id}"`,
          suggestionMessage: rule.suggestionMessage,
          affectedItems: [currentItem.id, nextItem.id],
          itemTitles: [currentItem.title || currentItem.id, nextItem.title || nextItem.id],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  private validateMeetingBuffer<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const bufferMinutes = rule.condition.parameters['bufferMinutes'] || 10;
    const meetings = items.filter(item => item.type === 'meeting' && item.startDate);
    const sortedMeetings = meetings.sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
    
    for (let i = 0; i < sortedMeetings.length - 1; i++) {
      const currentMeeting = sortedMeetings[i];
      const nextMeeting = sortedMeetings[i + 1];
      
      const timeBetween = this.getTimeBetweenItems(currentMeeting, nextMeeting);
      if (timeBetween < bufferMinutes) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Only ${timeBetween} minutes between "${currentMeeting.title || currentMeeting.id}" and "${nextMeeting.title || nextMeeting.id}" (requires ${bufferMinutes})`,
          suggestionMessage: rule.suggestionMessage,
          affectedItems: [currentMeeting.id, nextMeeting.id],
          itemTitles: [currentMeeting.title || currentMeeting.id, nextMeeting.title || nextMeeting.id],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  private validateLocationGrouping<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxGapMinutes = rule.condition.parameters['maxGapMinutes'] || 180;
    const itemsWithLocation = items.filter(item => item.location && item.startDate);
    const groupedByLocation = this.groupItemsByLocation(itemsWithLocation);
    
    for (const [location, locationItems] of Object.entries(groupedByLocation)) {
      if (locationItems.length > 1) {
        const timeGaps = this.findTimeGaps(locationItems);
        
        for (const gap of timeGaps) {
          if (gap.gapMinutes > maxGapMinutes) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `Large ${gap.gapMinutes}-minute gap between items at ${location}`,
              suggestionMessage: rule.suggestionMessage,
              affectedItems: [gap.beforeItem.id, gap.afterItem.id],
              itemTitles: [gap.beforeItem.title || gap.beforeItem.id, gap.afterItem.title || gap.afterItem.id],
              timestamp: new Date()
            });
          }
        }
      }
    }
    
    return violations;
  }

  private validateWorkloadLimit<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxItemsPerDay = rule.condition.parameters['maxItemsPerDay'] || 8;
    const itemsByDate = this.groupItemsByDate(items.filter(item => item.startDate));
    
    for (const [dateStr, dayItems] of Object.entries(itemsByDate)) {
      if (dayItems.length > maxItemsPerDay) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${dayItems.length} items scheduled for ${dateStr} (limit: ${maxItemsPerDay})`,
          suggestionMessage: rule.suggestionMessage,
          affectedItems: dayItems.map(item => item.id),
          itemTitles: dayItems.map(item => item.title || item.id),
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  private validateDuration<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxDuration = rule.condition.parameters['maxDurationMinutes'] || 480;
    const minDuration = rule.condition.parameters['minDurationMinutes'] || 5;
    
    for (const item of items) {
      const duration = this.getItemDuration(item);
      
      if (duration > maxDuration) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${item.title || item.id}" duration (${duration} min) exceeds maximum (${maxDuration} min)`,
          suggestionMessage: rule.suggestionMessage,
          affectedItems: [item.id],
          itemTitles: [item.title || item.id],
          timestamp: new Date()
        });
      }
      
      if (duration < minDuration) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${item.title || item.id}" duration (${duration} min) below minimum (${minDuration} min)`,
          suggestionMessage: rule.suggestionMessage,
          affectedItems: [item.id],
          itemTitles: [item.title || item.id],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  private validateBreakRequirement<T extends ValidatableItem>(items: T[], rule: ValidationRule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const workHoursThreshold = rule.condition.parameters['workHoursThreshold'] || 240;
    const requiredBreakMinutes = rule.condition.parameters['requiredBreakMinutes'] || 30;
    
    const workItems = items.filter(item => 
      ['meeting', 'work', 'task'].includes(item.type || '') && item.startDate
    ).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
    
    let continuousWorkTime = 0;
    let lastItemEnd: Date | null = null;
    
    for (const item of workItems) {
      if (lastItemEnd && item.startDate) {
        const breakTime = Math.round((item.startDate.getTime() - lastItemEnd.getTime()) / (1000 * 60));
        
        if (breakTime < requiredBreakMinutes && continuousWorkTime > workHoursThreshold) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Insufficient break (${breakTime} min) after ${Math.round(continuousWorkTime/60)} hours of work before "${item.title || item.id}"`,
            suggestionMessage: rule.suggestionMessage,
            affectedItems: [item.id],
            itemTitles: [item.title || item.id],
            timestamp: new Date()
          });
        }
        
        continuousWorkTime = breakTime < requiredBreakMinutes ? continuousWorkTime : 0;
      }
      
      continuousWorkTime += this.getItemDuration(item);
      lastItemEnd = this.getItemEndDate(item);
    }
    
    return violations;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private itemsOverlap<T extends ValidatableItem>(item1: T, item2: T): boolean {
    if (!item1.startDate || !item2.startDate) return false;
    
    const item1End = this.getItemEndDate(item1);
    const item2End = this.getItemEndDate(item2);
    
    return item1.startDate < item2End && item2.startDate < item1End;
  }

  private getItemEndDate<T extends ValidatableItem>(item: T): Date {
    if (item.endDate) return item.endDate;
    if (!item.startDate) return new Date();
    
    const duration = this.getItemDuration(item);
    return new Date(item.startDate.getTime() + (duration * 60 * 1000));
  }

  private getItemDuration<T extends ValidatableItem>(item: T): number {
    if (item.durationMinutes) return item.durationMinutes;
    if (item.endDate && item.startDate) {
      return Math.round((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60));
    }
    return 50; // Default duration
  }

  private getTimeBetweenItems<T extends ValidatableItem>(item1: T, item2: T): number {
    if (!item2.startDate) return 0;
    
    const item1End = this.getItemEndDate(item1);
    return Math.round((item2.startDate.getTime() - item1End.getTime()) / (1000 * 60));
  }

  private groupItemsByLocation<T extends ValidatableItem>(items: T[]): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const location = item.location || 'Unknown';
      if (!groups[location]) groups[location] = [];
      groups[location].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private groupItemsByDate<T extends ValidatableItem>(items: T[]): Record<string, T[]> {
    return items.reduce((groups, item) => {
      if (!item.startDate) return groups;
      
      const dateStr = item.startDate.toDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private findTimeGaps<T extends ValidatableItem>(items: T[]): TimeGap[] {
    const gaps: TimeGap[] = [];
    const sortedItems = items
      .filter(item => item.startDate)
      .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
    
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const beforeItem = sortedItems[i];
      const afterItem = sortedItems[i + 1];
      const gapMinutes = this.getTimeBetweenItems(beforeItem, afterItem);
      
      gaps.push({ beforeItem, afterItem, gapMinutes });
    }
    
    return gaps;
  }

  private getSeverityWeight(severity: RuleSeverity): number {
    switch (severity) {
      case 'error': return 3;
      case 'warning': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private generateSuggestions(violations: RuleViolation[]): string[] {
    const suggestions = new Set<string>();
    
    violations.forEach(violation => {
      if (violation.suggestionMessage) {
        suggestions.add(violation.suggestionMessage);
      }
    });
    
    return Array.from(suggestions);
  }
}

/**
 * Type definition for custom rule validator functions
 */
export type RuleValidator = <T extends ValidatableItem>(items: T[], rule: ValidationRule) => RuleViolation[];