import { AppConfig, EvaluationCategory, ScoringWeights } from '../models';

export const DEFAULT_CATEGORIES: EvaluationCategory[] = [
  {
    key: 'time_sensitivity',
    name: 'Time Sensitivity',
    description: 'How urgent is this task? When does it need to be done?',
    scaleLabels: ['Can Wait', 'Soon', 'Urgent'],
    weight: 1.0,
    inverseScoring: false
  },
  {
    key: 'impact',
    name: 'Impact',
    description: 'How important is this task? What happens if it\'s not done?',
    scaleLabels: ['Low Impact', 'Medium Impact', 'High Impact'],
    weight: 1.2,
    inverseScoring: false
  },
  {
    key: 'effort',
    name: 'Effort Required',
    description: 'How much work is needed to complete this task?',
    scaleLabels: ['Quick', 'Moderate', 'Complex'],
    weight: 0.8,
    inverseScoring: true // High effort = lower priority
  },
  {
    key: 'energy_level',
    name: 'Energy Level',
    description: 'How much mental/physical energy does this task require?',
    scaleLabels: ['Low Energy', 'Medium Energy', 'High Energy'],
    weight: 0.7,
    inverseScoring: false // Match to current energy state
  }
];

export const DEFAULT_WEIGHTS: ScoringWeights = {
  time_sensitivity: 1.0,
  impact: 1.2,
  effort: 0.8,
  energy_level: 0.7
};

export const DEFAULT_CONFIG: AppConfig = {
  categories: DEFAULT_CATEGORIES,
  defaultWeights: DEFAULT_WEIGHTS,
  ui: {
    appTitle: 'Task Triage',
    brainDumpPlaceholder: `Paste your tasks, thoughts, or notes here...

Examples:
• Call dentist about appointment
• Finish quarterly report
• Review team feedback
• Plan weekend trip
• Fix kitchen sink
• Update resume`,
    maxTasksPerSession: 25,
    enableProgressIndicators: true,
    theme: 'auto'
  },
  export: {
    defaultFormat: 'text',
    includeScoring: true,
    includeTimestamps: true,
    customFormats: []
  },
  parsing: {
    bulletPoints: ['•', '-', '*', '–', '—'],
    numberedLists: true,
    lineBreakSeparated: true,
    customDelimiters: [';', '|'],
    minTaskLength: 3,
    maxTaskLength: 200
  },
  version: '1.0.0'
};