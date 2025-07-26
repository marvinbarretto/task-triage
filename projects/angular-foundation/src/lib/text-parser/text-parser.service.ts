/**
 * Configuration options for text parsing
 */
export interface TextParserConfig {
  /** Bullet point characters to recognize (e.g., ['•', '-', '*']) */
  bulletPoints: string[];
  /** Whether to parse numbered lists (1. 2. 3.) */
  numberedLists: boolean;
  /** Whether to treat each line as a separate item */
  lineBreakSeparated: boolean;
  /** Custom delimiters for splitting text (e.g., [',', ';', '|']) */
  customDelimiters: string[];
  /** Minimum length for parsed items */
  minItemLength: number;
  /** Maximum length for parsed items (truncated with '...') */
  maxItemLength: number;
  /** Whether to capitalize first letter of each item */
  capitalizeFirst: boolean;
  /** Whether to remove trailing periods */
  removeTrailingPeriods: boolean;
}

/**
 * Default configuration for text parsing
 */
export const DEFAULT_TEXT_PARSER_CONFIG: TextParserConfig = {
  bulletPoints: ['•', '-', '*', '–', '—', '▪', '▫', '◦'],
  numberedLists: true,
  lineBreakSeparated: true,
  customDelimiters: [',', ';'],
  minItemLength: 3,
  maxItemLength: 200,
  capitalizeFirst: true,
  removeTrailingPeriods: true
};

/**
 * Detected format types for input text
 */
export type TextFormat = 'bullets' | 'numbered' | 'paragraphs' | 'mixed' | 'delimited';

/**
 * Generic Text Parser Service for Angular Applications
 * 
 * Provides comprehensive text parsing capabilities for converting unstructured text
 * into structured lists. Perfect for parsing user input like:
 * - Brain dumps and notes
 * - Todo lists 
 * - Meeting notes
 * - Shopping lists
 * - Survey responses
 * - CSV-like data
 * 
 * @example
 * // Parse a mixed-format list
 * const parser = new TextParser();
 * const items = parser.parseTextToList(`
 *   • Buy groceries
 *   • Call mom
 *   1. Finish project
 *   2. Review code
 *   Meeting with team tomorrow
 * `, { lineBreakSeparated: true });
 * // Result: ['Buy groceries', 'Call mom', 'Finish project', 'Review code', 'Meeting with team tomorrow']
 * 
 * @example
 * // Parse CSV-like data
 * const items = parser.parseTextToList('apples, bananas; oranges, grapes', {
 *   customDelimiters: [',', ';'],
 *   lineBreakSeparated: false
 * });
 * // Result: ['Apples', 'Bananas', 'Oranges', 'Grapes']
 * 
 * @example
 * // Detect format automatically
 * const format = parser.detectFormat('• Item 1\n• Item 2\n• Item 3');
 * // Result: 'bullets'
 * 
 * Use Cases:
 * - Task/todo list parsing
 * - Survey response processing  
 * - Note-taking applications
 * - Data import/migration
 * - User input normalization
 * - Content management systems
 * - Meeting minutes processing
 * - Shopping list organization
 * - Project planning tools
 * - Knowledge base creation
 */
export class TextParser {
  private config: TextParserConfig;

  constructor(config: Partial<TextParserConfig> = {}) {
    this.config = { ...DEFAULT_TEXT_PARSER_CONFIG, ...config };
  }

  /**
   * Parse unstructured text into a clean list of items
   * @param input Raw text input to parse
   * @param overrideConfig Optional config overrides for this specific parsing
   * @returns Array of cleaned and formatted text items
   * 
   * @example
   * const parser = new TextParser();
   * const tasks = parser.parseTextToList(`
   *   • Buy milk
   *   - Walk the dog
   *   1. Call dentist
   *   2. Pay bills
   *   Submit report by Friday
   * `);
   * // Result: ['Buy milk', 'Walk the dog', 'Call dentist', 'Pay bills', 'Submit report by Friday']
   */
  parseTextToList(input: string, overrideConfig?: Partial<TextParserConfig>): string[] {
    const config = overrideConfig ? { ...this.config, ...overrideConfig } : this.config;
    
    if (!input.trim()) {
      return [];
    }

    // Split into potential item lines
    const lines = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length >= config.minItemLength);

    const items: string[] = [];

    for (const line of lines) {
      // Check if line starts with bullet points
      const hasBullet = config.bulletPoints.some(bullet => 
        line.startsWith(bullet + ' ') || line.startsWith(bullet)
      );

      if (hasBullet) {
        // Remove bullet and clean up
        const item = this.removeBulletPoint(line, config);
        if (item.length >= config.minItemLength) {
          items.push(this.cleanupItem(item, config));
        }
      } 
      // Check for numbered lists
      else if (config.numberedLists && /^\d+[\.\)]\s/.test(line)) {
        const item = line.replace(/^\d+[\.\)]\s+/, '').trim();
        if (item.length >= config.minItemLength) {
          items.push(this.cleanupItem(item, config));
        }
      }
      // Check for custom delimiters
      else if (config.customDelimiters.some(delimiter => line.includes(delimiter))) {
        const delimiter = config.customDelimiters.find(d => line.includes(d));
        if (delimiter) {
          const parts = line.split(delimiter).map(part => part.trim());
          for (const part of parts) {
            if (part.length >= config.minItemLength) {
              items.push(this.cleanupItem(part, config));
            }
          }
        }
      }
      // Line break separated items
      else if (config.lineBreakSeparated && line.length >= config.minItemLength) {
        items.push(this.cleanupItem(line, config));
      }
    }

    // Remove duplicates and apply length limits
    const uniqueItems = [...new Set(items)]
      .map(item => item.length > config.maxItemLength ? 
        item.substring(0, config.maxItemLength) + '...' : item)
      .filter(item => item.length >= config.minItemLength);

    return uniqueItems;
  }

  /**
   * Detect the predominant format of the input text
   * @param input Text to analyze
   * @returns Detected format type
   * 
   * @example
   * const format1 = parser.detectFormat('• Item 1\n• Item 2\n• Item 3');
   * // Result: 'bullets'
   * 
   * const format2 = parser.detectFormat('1. First\n2. Second\n3. Third');
   * // Result: 'numbered'
   * 
   * const format3 = parser.detectFormat('apples, bananas, oranges');
   * // Result: 'delimited'
   */
  detectFormat(input: string): TextFormat {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) return 'paragraphs';
    
    let bulletCount = 0;
    let numberedCount = 0;
    let plainCount = 0;
    let hasDelimiters = false;
    
    // Check if any line contains delimiters
    for (const line of lines) {
      if (this.config.customDelimiters.some(delimiter => line.includes(delimiter))) {
        hasDelimiters = true;
        break;
      }
    }
    
    // If delimiters found and only one line, it's probably delimited
    if (hasDelimiters && lines.length === 1) {
      return 'delimited';
    }
    
    for (const line of lines) {
      if (this.config.bulletPoints.some(bullet => 
        line.startsWith(bullet + ' ') || line.startsWith(bullet))) {
        bulletCount++;
      } else if (/^\d+[\.\)]\s/.test(line)) {
        numberedCount++;
      } else {
        plainCount++;
      }
    }
    
    const total = lines.length;
    if (bulletCount / total > 0.6) return 'bullets';
    if (numberedCount / total > 0.6) return 'numbered';
    if (plainCount / total > 0.6) return 'paragraphs';
    if (hasDelimiters) return 'delimited';
    return 'mixed';
  }

  /**
   * Get parsing statistics for the input text
   * @param input Text to analyze
   * @returns Object with parsing statistics
   * 
   * @example
   * const stats = parser.getParsingStats('• Item 1\n• Item 2\nPlain text');
   * // Result: { totalLines: 3, bulletItems: 2, numberedItems: 0, plainItems: 1, ... }
   */
  getParsingStats(input: string) {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let bulletItems = 0;
    let numberedItems = 0;
    let plainItems = 0;
    let delimiterItems = 0;
    
    for (const line of lines) {
      if (this.config.bulletPoints.some(bullet => 
        line.startsWith(bullet + ' ') || line.startsWith(bullet))) {
        bulletItems++;
      } else if (/^\d+[\.\)]\s/.test(line)) {
        numberedItems++;
      } else if (this.config.customDelimiters.some(delimiter => line.includes(delimiter))) {
        // Count delimiter-separated items in this line
        const delimiter = this.config.customDelimiters.find(d => line.includes(d));
        if (delimiter) {
          delimiterItems += line.split(delimiter).length;
        }
      } else {
        plainItems++;
      }
    }
    
    return {
      totalLines: lines.length,
      bulletItems,
      numberedItems,
      plainItems,
      delimiterItems,
      detectedFormat: this.detectFormat(input),
      estimatedItems: bulletItems + numberedItems + plainItems + delimiterItems
    };
  }

  /**
   * Update the parser configuration
   * @param newConfig Partial configuration to merge
   * 
   * @example
   * parser.updateConfig({ 
   *   bulletPoints: ['→', '▶'], 
   *   minItemLength: 5 
   * });
   */
  updateConfig(newConfig: Partial<TextParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get the current parser configuration
   * @returns Current configuration object
   */
  getConfig(): TextParserConfig {
    return { ...this.config };
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private removeBulletPoint(line: string, config: TextParserConfig): string {
    let item = line;
    for (const bullet of config.bulletPoints) {
      if (item.startsWith(bullet + ' ')) {
        return item.substring(bullet.length + 1).trim();
      } else if (item.startsWith(bullet)) {
        return item.substring(bullet.length).trim();
      }
    }
    return item;
  }

  private cleanupItem(item: string, config: TextParserConfig): string {
    // Remove extra whitespace
    item = item.replace(/\s+/g, ' ').trim();
    
    // Remove trailing punctuation if configured
    if (config.removeTrailingPeriods && item.endsWith('.') && !item.endsWith('...')) {
      item = item.substring(0, item.length - 1);
    }
    
    // Capitalize first letter if configured
    if (config.capitalizeFirst && item.length > 0) {
      item = item.charAt(0).toUpperCase() + item.slice(1);
    }
    
    return item;
  }
}