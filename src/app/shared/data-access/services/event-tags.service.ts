import { Injectable, inject } from '@angular/core';
import { LLMService } from '../../../../../projects/angular-foundation/src/lib/llm/gemini.service';
import { EVENT_TAG_COLORS } from '@shared/utils/event-tags.constants';

@Injectable({
  providedIn: 'root'
})
export class EventTagsService {
  private llmService = inject(LLMService);

  // Available tags from our predefined set
  private readonly availableTags = Object.keys(EVENT_TAG_COLORS);

  /**
   * Generate event tags using LLM with fallback to regex matching
   */
  async generateTagsFromContent(
    title: string, 
    description: string = '', 
    eventType?: string
  ): Promise<string[]> {
    try {
      // Try LLM first
      const llmTags = await this.generateTagsWithLLM(title, description, eventType);
      if (llmTags.length > 0) {
        console.log(`[EventTagsService] LLM generated tags: ${llmTags.join(', ')}`);
        return llmTags;
      }
    } catch (error) {
      console.warn(`[EventTagsService] LLM failed, falling back to regex:`, error);
    }

    // Fallback to regex matching
    const regexTags = this.generateTagsWithRegex(title, description, eventType);
    console.log(`[EventTagsService] Regex generated tags: ${regexTags.join(', ')}`);
    return regexTags;
  }

  /**
   * Generate tags using LLM with structured prompt
   */
  private async generateTagsWithLLM(
    title: string, 
    description: string = '', 
    eventType?: string
  ): Promise<string[]> {
    const prompt = this.buildTagExtractionPrompt(title, description, eventType);
    
    const response = await this.llmService.generateContent({
      prompt,
      model: 'gemini-1.5-flash-8b', // Use cheapest/fastest model
      temperature: 0.1 // Low temperature for consistent results
    });

    if (!response.success) {
      throw new Error(response.error || 'LLM request failed');
    }

    return this.parseTagsFromLLMResponse(response.data);
  }

  /**
   * Build structured prompt for LLM tag extraction
   */
  private buildTagExtractionPrompt(title: string, description: string, eventType?: string): string {
    const availableTagsList = this.availableTags.map(tag => {
      const config = EVENT_TAG_COLORS[tag];
      return `- ${tag}: ${config.emoji} ${config.label}`;
    }).join('\n');

    return `You are an expert at categorizing tasks and events. Based on the task content below, select the most relevant tags from the predefined list.

TASK DETAILS:
Title: "${title}"
Description: "${description || 'None'}"
${eventType ? `Event Type: ${eventType}` : ''}

AVAILABLE TAGS:
${availableTagsList}

INSTRUCTIONS:
1. Select 0-3 most relevant tags based on the task's content and purpose
2. Consider what the person is actually doing, not just keywords
3. Only use tags from the list above - no new tags
4. If no tags are clearly relevant, select "general"
5. Return only the tag names, comma-separated, no explanations

EXAMPLES:
- "Go for a 30-minute run in the park" → fitness
- "Prepare healthy lunch for the week" → nutrition
- "Team meeting about Q4 budget planning" → career, finance
- "Call mom to catch up" → social
- "Read chapter 5 of programming book" → learning
- "Vacuum living room and kitchen" → home
- "Plan vacation to Italy" → travel, entertainment

RESPONSE FORMAT: Just the tag names, comma-separated (e.g., "fitness, mental-health" or "general")

YOUR RESPONSE:`;
  }

  /**
   * Parse tags from LLM response
   */
  private parseTagsFromLLMResponse(response: string): string[] {
    try {
      // Clean up the response
      const cleanedResponse = response
        .trim()
        .toLowerCase()
        .replace(/['""`]/g, '') // Remove quotes
        .replace(/\.$/, ''); // Remove trailing period

      if (!cleanedResponse) {
        return ['general'];
      }

      // Split by comma and clean each tag
      const tags = cleanedResponse
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .filter(tag => this.availableTags.includes(tag)) // Only valid tags
        .slice(0, 3); // Max 3 tags

      return tags.length > 0 ? tags : ['general'];
    } catch (error) {
      console.warn('[EventTagsService] Failed to parse LLM response:', error);
      return ['general'];
    }
  }

  /**
   * Fallback regex-based tag generation (original implementation)
   */
  private generateTagsWithRegex(title: string, description: string = '', eventType?: string): string[] {
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