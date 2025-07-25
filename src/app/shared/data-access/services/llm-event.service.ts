import { Injectable, inject } from '@angular/core';
import { LLMService } from 'angular-foundation';
import { EventCard, EventProcessingResult, EventType, SchedulingFlexibility, EventPriority, RepetitionPattern } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class LLMEventService {
  private llmService = inject(LLMService);

  async processNoteForEvents(noteText: string): Promise<EventProcessingResult> {
    const startTime = Date.now();
    
    console.log(`[LLMEventService] Processing note: "${noteText.substring(0, 100)}..."`);
    
    try {
      // Split note into lines and filter out empty lines
      const lines = noteText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      console.log(`[LLMEventService] Processing ${lines.length} lines`);
      
      if (lines.length === 0) {
        return {
          originalNote: noteText,
          generatedCards: [],
          processingSuccess: false,
          errorMessage: 'No valid lines found to process',
          processingTime: Date.now() - startTime
        };
      }
      
      // Process each line as a potential event
      const allCards: EventCard[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`[LLMEventService] Processing line ${i + 1}: "${line}"`);
        
        try {
          const prompt = this.buildEventExtractionPromptForLine(line, i);
          const response = await this.llmService.generateContent(prompt, 'gemini-1.5-flash-8b');
          
          if (response.success) {
            const lineCards = this.parseEventCardsFromResponse(response.data, line, i);
            allCards.push(...lineCards);
          } else {
            // Create fallback card for this line
            console.warn(`[LLMEventService] Failed to process line ${i + 1}, creating fallback`);
            const fallbackCards = this.createFallbackEventCard(line, i);
            allCards.push(...fallbackCards);
          }
        } catch (error) {
          console.warn(`[LLMEventService] Error processing line ${i + 1}:`, error);
          // Create fallback card for this line
          const fallbackCards = this.createFallbackEventCard(line, i);
          allCards.push(...fallbackCards);
        }
      }
      
      console.log(`[LLMEventService] Generated ${allCards.length} event cards from ${lines.length} lines`);
      
      return {
        originalNote: noteText,
        generatedCards: allCards,
        processingSuccess: true,
        processingTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      console.error('[LLMEventService] Processing error:', error);
      
      return {
        originalNote: noteText,
        generatedCards: [],
        processingSuccess: false,
        errorMessage: error.message || 'Unexpected processing error',
        processingTime: Date.now() - startTime
      };
    }
  }

  private buildEventExtractionPromptForLine(lineText: string, lineIndex: number): string {
    return `You are an AI assistant that extracts a calendar event from a single line of text. 

Analyze the following line and extract ONE calendar event. Provide:
- A clear, actionable title
- A description (optional)
- Event type (meeting, task, reminder, appointment, deadline, personal, work)
- Suggested date/time if mentioned or can be inferred
- Duration in minutes (default to 50 minutes = 2 pomodoros if not specified)
- Your confidence level (0-1)
- Brief reasoning for your interpretation

Line ${lineIndex + 1}: "${lineText}"

Please respond in JSON format with a single event:
{
  "title": "Clear, actionable title",
  "description": "Optional description", 
  "type": "meeting|task|reminder|appointment|deadline|personal|work",
  "suggestedDate": "YYYY-MM-DD or null",
  "suggestedTime": "HH:MM or null", 
  "durationMinutes": 50,
  "confidence": 0.85,
  "reasoning": "Brief explanation of interpretation"
}

Guidelines:
- Create exactly ONE event from this line
- Be specific and actionable in the title
- Only suggest dates/times if clearly indicated or strongly implied
- Default to 50 minutes duration (2 pomodoros) unless specific duration is mentioned
- Use high confidence (0.8+) only when very certain
- If the line is vague, create a general event with lower confidence
- Focus on making the event useful and actionable`;
  }

  private buildEventExtractionPrompt(noteText: string): string {
    return `You are an AI assistant that extracts calendar events from natural language notes. 

Analyze the following note and extract potential calendar events. For each event, provide:
- A clear title
- A description (optional)
- Event type (meeting, task, reminder, appointment, deadline, personal, work)
- Suggested date/time if mentioned or can be inferred
- Duration in minutes (default to 50 minutes = 2 pomodoros if not specified)
- Your confidence level (0-1)
- Brief reasoning for your interpretation

User's note: "${noteText}"

Please respond in JSON format with an array of events:
{
  "events": [
    {
      "title": "Clear, actionable title",
      "description": "Optional description",
      "type": "meeting|task|reminder|appointment|deadline|personal|work",
      "suggestedDate": "YYYY-MM-DD or null",
      "suggestedTime": "HH:MM or null",
      "durationMinutes": 50,
      "confidence": 0.85,
      "reasoning": "Brief explanation of interpretation"
    }
  ]
}

Guidelines:
- Extract 1-4 events maximum
- Be specific and actionable in titles
- Only suggest dates/times if clearly indicated or strongly implied
- Default to 50 minutes duration (2 pomodoros) unless specific duration is mentioned
- Use high confidence (0.8+) only when very certain
- If the note is vague, create general events with lower confidence
- Prefer creating useful events over being overly cautious`;
  }

  private parseEventCardsFromResponse(responseText: string, originalNote: string, lineIndex?: number): EventCard[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[LLMEventService] No JSON found in response, creating fallback event');
        return this.createFallbackEventCard(originalNote, lineIndex);
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // For line-based processing, we expect a single event object, not an array
      if (lineIndex !== undefined) {
        // Single line processing - expect single event object
        const card = this.convertToEventCard(parsed, originalNote, lineIndex || 0);
        return card ? [card] : this.createFallbackEventCard(originalNote, lineIndex);
      } else {
        // Legacy multi-event processing
        const events = parsed.events || parsed.event || [parsed];
        
        if (!Array.isArray(events)) {
          console.warn('[LLMEventService] Response not in expected array format');
          return this.createFallbackEventCard(originalNote, lineIndex);
        }
        
        return events.map((event: any, index: number) => this.convertToEventCard(event, originalNote, index))
                    .filter((card: EventCard | null) => card !== null) as EventCard[];
      }
      
    } catch (error) {
      console.warn('[LLMEventService] Failed to parse LLM response:', error);
      return this.createFallbackEventCard(originalNote, lineIndex);
    }
  }

  private convertToEventCard(eventData: any, originalNote: string, index: number): EventCard | null {
    try {
      const now = new Date();
      
      // Validate required fields
      if (!eventData.title || typeof eventData.title !== 'string') {
        console.warn('[LLMEventService] Event missing required title field');
        return null;
      }
      
      // Validate event type
      const validTypes: EventType[] = ['meeting', 'task', 'reminder', 'appointment', 'deadline', 'personal', 'work'];
      const eventType = validTypes.includes(eventData.type) ? eventData.type : 'task';
      
      // Parse suggested date
      let suggestedStartDate: Date | undefined;
      if (eventData.suggestedDate) {
        try {
          suggestedStartDate = new Date(eventData.suggestedDate);
          if (isNaN(suggestedStartDate.getTime())) {
            suggestedStartDate = undefined;
          }
        } catch {
          suggestedStartDate = undefined;
        }
      }
      
      // Validate confidence
      const confidence = typeof eventData.confidence === 'number' && eventData.confidence >= 0 && eventData.confidence <= 1 
        ? eventData.confidence 
        : 0.5;
      
      // Parse duration, default to 50 minutes (2 pomodoros)
      const durationMinutes = typeof eventData.durationMinutes === 'number' && eventData.durationMinutes > 0
        ? eventData.durationMinutes
        : 50;
      
      const card: EventCard = {
        id: `event_card_${Date.now()}_${index}`,
        originalText: originalNote,
        extractedTitle: eventData.title.trim(),
        extractedDescription: eventData.description?.trim() || undefined,
        suggestedType: eventType,
        suggestedStartDate,
        suggestedTime: eventData.suggestedTime || undefined,
        suggestedDurationMinutes: durationMinutes,
        confidence,
        reasoning: eventData.reasoning || 'Event extracted from user note',
        isSelected: false,
        // Enhanced characteristics with defaults
        schedulingFlexibility: 'anytime',
        priority: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
        isUrgent: eventType === 'deadline',
        templatePotential: false,
        repetitionPattern: { type: 'none' },
        canBeMovedIfNeeded: true
      };
      
      return card;
      
    } catch (error) {
      console.warn('[LLMEventService] Error converting event data:', error);
      return null;
    }
  }

  private createFallbackEventCard(originalNote: string, lineIndex?: number): EventCard[] {
    console.log('[LLMEventService] Creating fallback event card');
    
    const fallbackCard: EventCard = {
      id: `fallback_card_${Date.now()}_${lineIndex || 0}`,
      originalText: originalNote,
      extractedTitle: this.generateFallbackTitle(originalNote),
      extractedDescription: originalNote.length > 50 ? originalNote : undefined,
      suggestedType: 'task',
      confidence: 0.3,
      reasoning: lineIndex !== undefined 
        ? `Generated as fallback for line ${lineIndex + 1} when AI processing failed`
        : 'Generated as fallback when AI processing failed',
      isSelected: false,
      // Enhanced characteristics with defaults
      schedulingFlexibility: 'anytime',
      priority: 'low',
      isUrgent: false,
      templatePotential: false,
      repetitionPattern: { type: 'none' },
      canBeMovedIfNeeded: true
    };
    
    return [fallbackCard];
  }

  private generateFallbackTitle(note: string): string {
    // Extract first meaningful phrase for title
    const cleaned = note.trim();
    
    // If note is short, use it as-is
    if (cleaned.length <= 50) {
      return cleaned;
    }
    
    // Try to find first sentence
    const firstSentence = cleaned.split(/[.!?]/)[0];
    if (firstSentence.length <= 50) {
      return firstSentence.trim();
    }
    
    // Truncate to first 47 characters and add ellipsis
    return cleaned.substring(0, 47).trim() + '...';
  }

  // Helper methods
  validateNoteInput(noteText: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!noteText.trim()) {
      errors.push('Please enter a note to process');
    }
    
    if (noteText.trim().length < 5) {
      errors.push('Note is too short - please provide more detail');
    }
    
    if (noteText.trim().length > 1000) {
      errors.push('Note is too long - please keep it under 1000 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getEventTypeColor(type: EventType): string {
    const colors: Record<EventType, string> = {
      'meeting': '#3B82F6',
      'task': '#10B981', 
      'reminder': '#F59E0B',
      'appointment': '#8B5CF6',
      'deadline': '#EF4444',
      'personal': '#06B6D4',
      'work': '#6B7280'
    };
    
    return colors[type] || colors.task;
  }

  getEventTypeIcon(type: EventType): string {
    const icons: Record<EventType, string> = {
      'meeting': '🤝',
      'task': '✅',
      'reminder': '🔔',
      'appointment': '📅',
      'deadline': '⏰',
      'personal': '🏠',
      'work': '💼'
    };
    
    return icons[type] || icons.task;
  }
}