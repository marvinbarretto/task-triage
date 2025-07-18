import { ParsingConfiguration } from '../data-access/models';

export class TaskParser {
  static parseTaskList(input: string, config: ParsingConfiguration): string[] {
    if (!input.trim()) {
      return [];
    }

    // Split into potential task lines
    const lines = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length >= config.minTaskLength);

    const tasks: string[] = [];

    for (const line of lines) {
      // Check if line starts with bullet points
      const hasBullet = config.bulletPoints.some(bullet => 
        line.startsWith(bullet + ' ') || line.startsWith(bullet)
      );

      if (hasBullet) {
        // Remove bullet and clean up
        let task = line;
        for (const bullet of config.bulletPoints) {
          if (task.startsWith(bullet + ' ')) {
            task = task.substring(bullet.length + 1).trim();
            break;
          } else if (task.startsWith(bullet)) {
            task = task.substring(bullet.length).trim();
            break;
          }
        }
        if (task.length >= config.minTaskLength) {
          tasks.push(this.cleanupTask(task, config));
        }
      } 
      // Check for numbered lists
      else if (config.numberedLists && /^\d+[\.\)]\s/.test(line)) {
        const task = line.replace(/^\d+[\.\)]\s+/, '').trim();
        if (task.length >= config.minTaskLength) {
          tasks.push(this.cleanupTask(task, config));
        }
      }
      // Check for custom delimiters
      else if (config.customDelimiters.some(delimiter => line.includes(delimiter))) {
        const delimiter = config.customDelimiters.find(d => line.includes(d));
        if (delimiter) {
          const parts = line.split(delimiter).map(part => part.trim());
          for (const part of parts) {
            if (part.length >= config.minTaskLength) {
              tasks.push(this.cleanupTask(part, config));
            }
          }
        }
      }
      // Line break separated tasks
      else if (config.lineBreakSeparated && line.length >= config.minTaskLength) {
        tasks.push(this.cleanupTask(line, config));
      }
    }

    // Remove duplicates and apply length limits
    const uniqueTasks = [...new Set(tasks)]
      .map(task => task.length > config.maxTaskLength ? 
        task.substring(0, config.maxTaskLength) + '...' : task)
      .filter(task => task.length >= config.minTaskLength);

    return uniqueTasks;
  }

  private static cleanupTask(task: string, config: ParsingConfiguration): string {
    // Remove extra whitespace
    task = task.replace(/\s+/g, ' ').trim();
    
    // Remove trailing punctuation if it's just a period
    if (task.endsWith('.') && !task.endsWith('...')) {
      task = task.substring(0, task.length - 1);
    }
    
    // Capitalize first letter
    if (task.length > 0) {
      task = task.charAt(0).toUpperCase() + task.slice(1);
    }
    
    return task;
  }

  static detectFormat(input: string): 'bullets' | 'numbered' | 'paragraphs' | 'mixed' {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let bulletCount = 0;
    let numberedCount = 0;
    let plainCount = 0;
    
    for (const line of lines) {
      if (/^[•\-\*–—]\s/.test(line)) {
        bulletCount++;
      } else if (/^\d+[\.\)]\s/.test(line)) {
        numberedCount++;
      } else {
        plainCount++;
      }
    }
    
    const total = lines.length;
    if (bulletCount / total > 0.7) return 'bullets';
    if (numberedCount / total > 0.7) return 'numbered';
    if (plainCount / total > 0.7) return 'paragraphs';
    return 'mixed';
  }
}