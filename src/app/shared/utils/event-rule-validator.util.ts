import { Event, Rule, RuleViolation, ValidationResult, RuleSeverity } from '../data-access/models/event.model';

export class EventRuleValidator {

  /**
   * Validates a collection of events against all enabled rules
   */
  static validateEvents(events: Event[], rules: Rule[]): ValidationResult {
    const violations: RuleViolation[] = [];
    const enabledRules = rules.filter(rule => rule.isEnabled);
    
    for (const rule of enabledRules) {
      const ruleViolations = this.validateRule(events, rule);
      violations.push(...ruleViolations);
    }
    
    return {
      isValid: violations.length === 0,
      violations: violations.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity)),
      suggestions: this.generateSuggestions(violations),
      validatedAt: new Date()
    };
  }

  /**
   * Validates events against a specific rule
   */
  private static validateRule(events: Event[], rule: Rule): RuleViolation[] {
    switch (rule.condition.type) {
      case 'time_conflict':
        return this.checkTimeConflicts(events, rule);
      case 'meeting_buffer':
        return this.checkMeetingBuffer(events, rule);
      case 'location_grouping':
        return this.checkLocationGrouping(events, rule);
      case 'workload_limit':
        return this.checkWorkloadLimit(events, rule);
      case 'duration_validation':
        return this.checkDurationValidation(events, rule);
      case 'break_requirement':
        return this.checkBreakRequirement(events, rule);
      default:
        console.warn(`Unknown rule condition type: ${rule.condition.type}`);
        return [];
    }
  }

  /**
   * Check for overlapping events
   */
  private static checkTimeConflicts(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const sortedEvents = events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];
      
      if (this.eventsOverlap(currentEvent, nextEvent)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${currentEvent.title}" overlaps with "${nextEvent.title}"`,
          suggestionMessage: rule.suggestionMessage,
          affectedEvents: [currentEvent.id, nextEvent.id],
          eventTitles: [currentEvent.title, nextEvent.title],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  /**
   * Check for adequate buffer time between meetings
   */
  private static checkMeetingBuffer(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const bufferMinutes = rule.condition.parameters['bufferMinutes'] || 10;
    const meetings = events.filter(event => event.type === 'meeting');
    const sortedMeetings = meetings.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    for (let i = 0; i < sortedMeetings.length - 1; i++) {
      const currentMeeting = sortedMeetings[i];
      const nextMeeting = sortedMeetings[i + 1];
      
      const timeBetween = this.getTimeBetweenEvents(currentMeeting, nextMeeting);
      if (timeBetween < bufferMinutes) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `Only ${timeBetween} minutes between "${currentMeeting.title}" and "${nextMeeting.title}" (requires ${bufferMinutes})`,
          suggestionMessage: rule.suggestionMessage,
          affectedEvents: [currentMeeting.id, nextMeeting.id],
          eventTitles: [currentMeeting.title, nextMeeting.title],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  /**
   * Check if location-related events are properly grouped
   */
  private static checkLocationGrouping(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const eventsWithLocation = events.filter(event => event.location);
    const groupedByLocation = this.groupEventsByLocation(eventsWithLocation);
    
    // Check for scattered location-based events
    for (const [location, locationEvents] of Object.entries(groupedByLocation)) {
      if (locationEvents.length > 1) {
        const timeGaps = this.findLargeTimeGaps(locationEvents);
        
        for (const gap of timeGaps) {
          if (gap.gapMinutes > 180) { // 3 hours gap threshold
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `Large ${gap.gapMinutes}-minute gap between events at ${location}`,
              suggestionMessage: rule.suggestionMessage,
              affectedEvents: [gap.beforeEvent.id, gap.afterEvent.id],
              eventTitles: [gap.beforeEvent.title, gap.afterEvent.title],
              timestamp: new Date()
            });
          }
        }
      }
    }
    
    return violations;
  }

  /**
   * Check workload limits (events per day/time period)
   */
  private static checkWorkloadLimit(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxEventsPerDay = rule.condition.parameters['maxEventsPerDay'] || 8;
    const eventsByDate = this.groupEventsByDate(events);
    
    for (const [dateStr, dayEvents] of Object.entries(eventsByDate)) {
      if (dayEvents.length > maxEventsPerDay) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `${dayEvents.length} events scheduled for ${dateStr} (limit: ${maxEventsPerDay})`,
          suggestionMessage: rule.suggestionMessage,
          affectedEvents: dayEvents.map(e => e.id),
          eventTitles: dayEvents.map(e => e.title),
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  /**
   * Check for reasonable event durations
   */
  private static checkDurationValidation(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxDuration = rule.condition.parameters['maxDurationMinutes'] || 480; // 8 hours
    const minDuration = rule.condition.parameters['minDurationMinutes'] || 5;
    
    for (const event of events) {
      const duration = event.durationMinutes || this.calculateEventDuration(event);
      
      if (duration > maxDuration) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${event.title}" duration (${duration} min) exceeds maximum (${maxDuration} min)`,
          suggestionMessage: rule.suggestionMessage,
          affectedEvents: [event.id],
          eventTitles: [event.title],
          timestamp: new Date()
        });
      }
      
      if (duration < minDuration) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: `"${event.title}" duration (${duration} min) below minimum (${minDuration} min)`,
          suggestionMessage: rule.suggestionMessage,
          affectedEvents: [event.id],
          eventTitles: [event.title],
          timestamp: new Date()
        });
      }
    }
    
    return violations;
  }

  /**
   * Check for mandatory breaks between long work sessions
   */
  private static checkBreakRequirement(events: Event[], rule: Rule): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const workHoursThreshold = rule.condition.parameters['workHoursThreshold'] || 240; // 4 hours
    const requiredBreakMinutes = rule.condition.parameters['requiredBreakMinutes'] || 30;
    
    const workEvents = events.filter(event => 
      event.type === 'meeting' || event.type === 'work' || event.type === 'task'
    ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    let continuousWorkTime = 0;
    let lastEventEnd: Date | null = null;
    
    for (const event of workEvents) {
      if (lastEventEnd) {
        const breakTime = this.getTimeBetweenEventEndAndStart(lastEventEnd, event.startDate);
        
        if (breakTime < requiredBreakMinutes && continuousWorkTime > workHoursThreshold) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: `Insufficient break (${breakTime} min) after ${Math.round(continuousWorkTime/60)} hours of work before "${event.title}"`,
            suggestionMessage: rule.suggestionMessage,
            affectedEvents: [event.id],
            eventTitles: [event.title],
            timestamp: new Date()
          });
        }
        
        continuousWorkTime = breakTime < requiredBreakMinutes ? continuousWorkTime : 0;
      }
      
      continuousWorkTime += event.durationMinutes || this.calculateEventDuration(event);
      lastEventEnd = this.getEventEndDate(event);
    }
    
    return violations;
  }

  // Helper methods

  private static eventsOverlap(event1: Event, event2: Event): boolean {
    const event1End = this.getEventEndDate(event1);
    const event2End = this.getEventEndDate(event2);
    
    return event1.startDate < event2End && event2.startDate < event1End;
  }

  private static getEventEndDate(event: Event): Date {
    if (event.endDate) {
      return event.endDate;
    }
    
    const duration = event.durationMinutes || 50; // Default 50 minutes
    return new Date(event.startDate.getTime() + (duration * 60 * 1000));
  }

  private static calculateEventDuration(event: Event): number {
    if (event.durationMinutes) {
      return event.durationMinutes;
    }
    
    if (event.endDate) {
      return Math.round((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60));
    }
    
    return 50; // Default duration
  }

  private static getTimeBetweenEvents(event1: Event, event2: Event): number {
    const event1End = this.getEventEndDate(event1);
    return Math.round((event2.startDate.getTime() - event1End.getTime()) / (1000 * 60));
  }

  private static getTimeBetweenEventEndAndStart(endDate: Date, startDate: Date): number {
    return Math.round((startDate.getTime() - endDate.getTime()) / (1000 * 60));
  }

  private static groupEventsByLocation(events: Event[]): Record<string, Event[]> {
    return events.reduce((groups, event) => {
      const location = event.location || 'Unknown';
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(event);
      return groups;
    }, {} as Record<string, Event[]>);
  }

  private static groupEventsByDate(events: Event[]): Record<string, Event[]> {
    return events.reduce((groups, event) => {
      const dateStr = event.startDate.toDateString();
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(event);
      return groups;
    }, {} as Record<string, Event[]>);
  }

  private static findLargeTimeGaps(events: Event[]): Array<{
    beforeEvent: Event;
    afterEvent: Event;
    gapMinutes: number;
  }> {
    const gaps = [];
    const sortedEvents = events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const beforeEvent = sortedEvents[i];
      const afterEvent = sortedEvents[i + 1];
      const gapMinutes = this.getTimeBetweenEvents(beforeEvent, afterEvent);
      
      gaps.push({
        beforeEvent,
        afterEvent,
        gapMinutes
      });
    }
    
    return gaps;
  }

  private static getSeverityWeight(severity: RuleSeverity): number {
    switch (severity) {
      case 'error': return 3;
      case 'warning': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private static generateSuggestions(violations: RuleViolation[]): string[] {
    const suggestions = new Set<string>();
    
    violations.forEach(violation => {
      if (violation.suggestionMessage) {
        suggestions.add(violation.suggestionMessage);
      }
    });
    
    return Array.from(suggestions);
  }
}