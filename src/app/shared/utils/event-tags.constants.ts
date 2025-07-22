export interface EventTagConfig {
  emoji: string;
  label: string;
  color: string;
}

export const EVENT_TAG_COLORS: Record<string, EventTagConfig> = {
  'fitness': { emoji: '🏃‍♀️', label: 'Fitness', color: '#ef4444' },
  'nutrition': { emoji: '🍎', label: 'Nutrition', color: '#22c55e' },
  'mental-health': { emoji: '🧠', label: 'Mental Health', color: '#8b5cf6' },
  'career': { emoji: '💼', label: 'Career', color: '#3b82f6' },
  'social': { emoji: '👥', label: 'Social', color: '#f59e0b' },
  'learning': { emoji: '🎨', label: 'Learning', color: '#06b6d4' },
  'home': { emoji: '🏠', label: 'Home', color: '#84cc16' },
  'finance': { emoji: '💰', label: 'Finance', color: '#10b981' },
  'community': { emoji: '🌍', label: 'Community', color: '#14b8a6' },
  'growth': { emoji: '🎯', label: 'Growth', color: '#6366f1' },
  'entertainment': { emoji: '🎪', label: 'Fun', color: '#ec4899' },
  'rest': { emoji: '😴', label: 'Rest', color: '#64748b' },
  'travel': { emoji: '🚗', label: 'Travel', color: '#f97316' },
  'general': { emoji: '📝', label: 'General', color: '#6b7280' }
};