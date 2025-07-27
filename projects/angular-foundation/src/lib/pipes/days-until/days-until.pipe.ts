import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generic days until pipe for Angular applications.
 * 
 * This pipe calculates and displays the number of days between now and a target date,
 * with human-readable descriptions like "3 days to go", "Today", or "2 days ago".
 * 
 * Features:
 * - Handles multiple input date formats (string, Date, null, undefined)
 * - Smart day counting based on calendar days (not 24-hour periods)
 * - Past/present/future aware descriptions
 * - Graceful null handling with empty string fallback
 * - Customizable output format and labels
 * - Singular/plural handling for proper grammar
 * 
 * Use cases:
 * - Event countdowns and deadlines
 * - Task due date displays
 * - Launch date announcements
 * - Booking and reservation interfaces
 * - Any time-sensitive content display
 * 
 * Example usage:
 * ```html
 * <!-- Basic usage -->
 * <p>Launch: {{ launchDate | daysUntil }}</p>
 * 
 * <!-- With different scenarios -->
 * <p>{{ '2024-07-29' | daysUntil }}</p>        <!-- "3 days to go" -->
 * <p>{{ '2024-07-26' | daysUntil }}</p>        <!-- "Today" -->
 * <p>{{ '2024-07-24' | daysUntil }}</p>        <!-- "2 days ago" -->
 * <p>{{ null | daysUntil }}</p>                <!-- "" -->
 * 
 * <!-- With custom options -->
 * <p>{{ eventDate | daysUntil:true }}</p>      <!-- "3 day(s) to go" -->
 * <p>{{ eventDate | daysUntil:false:'remaining' }}</p> <!-- "3 days remaining" -->
 * ```
 */
@Pipe({
  name: 'daysUntil',
  standalone: true,
  pure: true
})
export class DaysUntilPipe implements PipeTransform {
  
  /**
   * Transform a date into days until description
   * 
   * @param dateInput - Target date (string, Date, null, or undefined)
   * @param showParentheses - Whether to show "(s)" for singular/plural (default: false)
   * @param futureLabel - Label for future dates (default: "to go")
   * @param pastLabel - Label for past dates (default: "ago")
   * @returns Human-readable days until string or empty string for null/undefined
   */
  transform(
    dateInput: string | Date | null | undefined,
    showParentheses: boolean = false,
    futureLabel: string = 'to go',
    pastLabel: string = 'ago'
  ): string {
    // Handle null/undefined gracefully
    if (!dateInput) return '';

    try {
      const now = new Date();
      const target = new Date(dateInput);
      
      // Validate the date
      if (isNaN(target.getTime())) {
        console.warn('[DaysUntilPipe] Invalid date provided:', dateInput);
        return '';
      }

      // Calculate difference in days (calendar days, not 24-hour periods)
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const diffTime = targetDate.getTime() - nowDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Handle different scenarios
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else if (diffDays === -1) {
        return 'Yesterday';
      } else if (diffDays > 0) {
        // Future date
        const dayLabel = this.getDayLabel(diffDays, showParentheses);
        return `${diffDays} ${dayLabel} ${futureLabel}`;
      } else {
        // Past date
        const dayLabel = this.getDayLabel(Math.abs(diffDays), showParentheses);
        return `${Math.abs(diffDays)} ${dayLabel} ${pastLabel}`;
      }
      
    } catch (error) {
      console.warn('[DaysUntilPipe] Error processing date:', dateInput, error);
      return '';
    }
  }

  /**
   * Get the appropriate day label (singular/plural)
   */
  private getDayLabel(days: number, showParentheses: boolean): string {
    if (showParentheses) {
      return 'day(s)';
    }
    return days === 1 ? 'day' : 'days';
  }
}

/**
 * Extended days until pipe with week/month granularity
 */
@Pipe({
  name: 'daysUntilExtended',
  standalone: true,
  pure: true
})
export class DaysUntilExtendedPipe implements PipeTransform {
  
  /**
   * Transform with week/month descriptions for longer periods
   */
  transform(
    dateInput: string | Date | null | undefined,
    useExtendedLabels: boolean = true
  ): string {
    if (!dateInput) return '';

    try {
      const now = new Date();
      const target = new Date(dateInput);
      
      if (isNaN(target.getTime())) {
        console.warn('[DaysUntilExtendedPipe] Invalid date provided:', dateInput);
        return '';
      }

      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const diffTime = targetDate.getTime() - nowDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Use basic pipe for short periods
      if (Math.abs(diffDays) <= 14) {
        return new DaysUntilPipe().transform(dateInput);
      }

      // Extended labels for longer periods
      if (useExtendedLabels) {
        const absDays = Math.abs(diffDays);
        const weeks = Math.round(absDays / 7);
        const months = Math.round(absDays / 30);
        
        let timeUnit: string;
        let timeValue: number;
        
        if (absDays < 60) {
          // Show weeks for 2-8 weeks
          timeUnit = weeks === 1 ? 'week' : 'weeks';
          timeValue = weeks;
        } else {
          // Show months for longer periods
          timeUnit = months === 1 ? 'month' : 'months';
          timeValue = months;
        }
        
        if (diffDays > 0) {
          return `${timeValue} ${timeUnit} to go`;
        } else {
          return `${timeValue} ${timeUnit} ago`;
        }
      }

      // Fallback to basic pipe
      return new DaysUntilPipe().transform(dateInput);
      
    } catch (error) {
      console.warn('[DaysUntilExtendedPipe] Error processing date:', dateInput, error);
      return '';
    }
  }
}