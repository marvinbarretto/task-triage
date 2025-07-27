import { Pipe, PipeTransform } from '@angular/core';

/**
 * Generic relative date pipe for Angular applications.
 * 
 * This pipe transforms dates into human-readable relative descriptions
 * like "Today", "Tomorrow", "Monday", or "Jan 15" based on proximity to current date.
 * 
 * Features:
 * - Handles multiple input date formats (string, Date, null, undefined)
 * - Smart relative descriptions (Today, Tomorrow, weekday names)
 * - Graceful fallback to formatted dates for distant dates
 * - Locale-aware formatting using browser's Intl API
 * - Null-safe with empty string fallback
 * - Works with past and future dates
 * 
 * Use cases:
 * - Event listings and calendar displays
 * - Message timestamps and chat applications
 * - Task due dates and scheduling interfaces
 * - News articles and blog post dates
 * - Any UI requiring human-friendly date displays
 * 
 * Example usage:
 * ```html
 * <!-- Basic usage -->
 * <p>Event date: {{ eventDate | relativeDate }}</p>
 * 
 * <!-- With different input types -->
 * <p>{{ '2024-07-26' | relativeDate }}</p>        <!-- "Today" -->
 * <p>{{ '2024-07-27' | relativeDate }}</p>        <!-- "Tomorrow" -->
 * <p>{{ '2024-07-29' | relativeDate }}</p>        <!-- "Monday" -->
 * <p>{{ '2024-08-15' | relativeDate }}</p>        <!-- "Aug 15" -->
 * <p>{{ null | relativeDate }}</p>                <!-- "" -->
 * 
 * <!-- In component -->
 * eventDate = new Date('2024-07-27');
 * dueDateString = '2024-07-30';
 * nullDate = null;
 * ```
 */
@Pipe({
  name: 'relativeDate',
  standalone: true,
  pure: true
})
export class RelativeDatePipe implements PipeTransform {
  
  /**
   * Transform a date into a relative description
   * 
   * @param date - Date to transform (string, Date, null, or undefined)
   * @returns Human-readable relative date string or empty string for null/undefined
   */
  transform(date: string | Date | null | undefined): string {
    // Handle null/undefined gracefully
    if (!date) return '';

    try {
      const now = new Date();
      const target = new Date(date);
      
      // Validate the date
      if (isNaN(target.getTime())) {
        console.warn('[RelativeDatePipe] Invalid date provided:', date);
        return '';
      }

      // Calculate difference in days (considering only date, not time)
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      const diffTime = targetDate.getTime() - nowDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Handle different relative ranges
      if (diffDays < -7) {
        // More than a week in the past - show formatted date
        return this.formatDate(target, 'past');
      } else if (diffDays < 0) {
        // In the past but within a week
        return 'In the past';
      } else if (diffDays === 0) {
        // Today
        return 'Today';
      } else if (diffDays === 1) {
        // Tomorrow
        return 'Tomorrow';
      } else if (diffDays < 7) {
        // Within next week - show weekday name
        return target.toLocaleDateString(undefined, { weekday: 'long' });
      } else {
        // More than a week in future - show formatted date
        return this.formatDate(target, 'future');
      }
      
    } catch (error) {
      console.warn('[RelativeDatePipe] Error processing date:', date, error);
      return '';
    }
  }

  /**
   * Format date for display when outside relative range
   */
  private formatDate(date: Date, context: 'past' | 'future'): string {
    try {
      // For dates outside the relative range, show month and day
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        // Add year if it's different from current year
        ...(date.getFullYear() !== new Date().getFullYear() && { year: 'numeric' })
      });
    } catch (error) {
      console.warn('[RelativeDatePipe] Error formatting date:', date, error);
      return date.toLocaleDateString(); // Fallback to basic formatting
    }
  }
}

/**
 * Extended relative date pipe with more granular time descriptions
 */
@Pipe({
  name: 'relativeDateExtended',
  standalone: true,
  pure: true
})
export class RelativeDateExtendedPipe implements PipeTransform {
  
  /**
   * Transform with more detailed relative descriptions including hours/minutes
   */
  transform(date: string | Date | null | undefined, showTime: boolean = false): string {
    if (!date) return '';

    try {
      const now = new Date();
      const target = new Date(date);
      
      if (isNaN(target.getTime())) {
        console.warn('[RelativeDateExtendedPipe] Invalid date provided:', date);
        return '';
      }

      const diffMs = target.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Very recent/near future (within an hour)
      if (Math.abs(diffMinutes) < 60) {
        if (diffMinutes < -1) return `${Math.abs(diffMinutes)} minutes ago`;
        if (diffMinutes === -1) return '1 minute ago';
        if (diffMinutes === 0) return 'Just now';
        if (diffMinutes === 1) return 'In 1 minute';
        if (diffMinutes > 1) return `In ${diffMinutes} minutes`;
      }

      // Recent/near future (within a day)
      if (Math.abs(diffHours) < 24) {
        if (diffHours < -1) return `${Math.abs(diffHours)} hours ago`;
        if (diffHours === -1) return '1 hour ago';
        if (diffHours === 1) return 'In 1 hour';
        if (diffHours > 1) return `In ${diffHours} hours`;
      }

      // Fall back to regular relative date logic
      const basicResult = new RelativeDatePipe().transform(date);
      
      // Optionally append time for same-day events
      if (showTime && (diffDays === 0 || Math.abs(diffDays) < 1)) {
        const timeString = target.toLocaleTimeString(undefined, { 
          hour: 'numeric', 
          minute: '2-digit' 
        });
        return `${basicResult} at ${timeString}`;
      }
      
      return basicResult;
      
    } catch (error) {
      console.warn('[RelativeDateExtendedPipe] Error processing date:', date, error);
      return '';
    }
  }
}