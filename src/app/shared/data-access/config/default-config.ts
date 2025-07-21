import { AppConfig, EvaluationCategory, ScoringWeights } from '../models';

export const DEFAULT_CATEGORIES: EvaluationCategory[] = [
  // Time & Urgency
  {
    key: 'time_sensitivity',
    name: 'Time Sensitivity',
    description: 'How urgent is this task? When does it need to be done?',
    scaleLabels: ['Can Wait', 'Soon', 'Urgent'],
    weight: 1.0,
    inverseScoring: false
  },
  {
    key: 'deadline_pressure',
    name: 'Deadline Pressure',
    description: 'How hard is the deadline? What are the consequences of missing it?',
    scaleLabels: ['Flexible', 'Firm', 'Critical'],
    weight: 1.1,
    inverseScoring: false
  },
  
  // Impact & Importance
  {
    key: 'impact',
    name: 'Impact',
    description: 'How important is this task? What happens if it\'s not done?',
    scaleLabels: ['Low Impact', 'Medium Impact', 'High Impact'],
    weight: 1.2,
    inverseScoring: false
  },
  {
    key: 'financial_impact',
    name: 'Financial Impact',
    description: 'Does this task affect money, cost savings, or revenue?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 1.3,
    inverseScoring: false
  },
  {
    key: 'career_impact',
    name: 'Career Impact',
    description: 'Will this task help advance your career or professional goals?',
    scaleLabels: ['No Impact', 'Some Impact', 'High Impact'],
    weight: 1.0,
    inverseScoring: false
  },
  {
    key: 'relationship_impact',
    name: 'Relationship Impact',
    description: 'Does this task affect relationships with family, friends, or colleagues?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 0.9,
    inverseScoring: false
  },
  
  // Effort & Resources
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
  },
  {
    key: 'creativity_required',
    name: 'Creativity Required',
    description: 'How much creative thinking or innovation does this task need?',
    scaleLabels: ['Routine', 'Some Creative', 'Very Creative'],
    weight: 0.6,
    inverseScoring: false
  },
  
  // Personal Growth & Development
  {
    key: 'personal_growth',
    name: 'Personal Growth',
    description: 'Will this task help you learn, improve, or develop new skills?',
    scaleLabels: ['No Growth', 'Some Growth', 'High Growth'],
    weight: 0.8,
    inverseScoring: false
  },
  {
    key: 'learning_opportunity',
    name: 'Learning Opportunity',
    description: 'How much will you learn from doing this task?',
    scaleLabels: ['Nothing New', 'Some Learning', 'Major Learning'],
    weight: 0.7,
    inverseScoring: false
  },
  {
    key: 'skill_building',
    name: 'Skill Building',
    description: 'Does this task build important skills for your future?',
    scaleLabels: ['No Skills', 'Some Skills', 'Key Skills'],
    weight: 0.8,
    inverseScoring: false
  },
  
  // Well-being & Life Balance
  {
    key: 'health_wellness',
    name: 'Health & Wellness',
    description: 'Does this task impact your physical or mental health?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 1.0,
    inverseScoring: false
  },
  {
    key: 'stress_level',
    name: 'Stress Level',
    description: 'How stressful or anxiety-inducing is this task?',
    scaleLabels: ['Low Stress', 'Some Stress', 'High Stress'],
    weight: 0.6,
    inverseScoring: true // High stress = lower priority
  },
  {
    key: 'enjoyment_factor',
    name: 'Enjoyment Factor',
    description: 'How much will you enjoy or find satisfaction in this task?',
    scaleLabels: ['Unenjoyable', 'Neutral', 'Enjoyable'],
    weight: 0.5,
    inverseScoring: false
  },
  {
    key: 'family_time',
    name: 'Family Time',
    description: 'Does this task affect time with family or loved ones?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 0.9,
    inverseScoring: false
  },
  {
    key: 'self_care',
    name: 'Self Care',
    description: 'Is this task related to taking care of yourself?',
    scaleLabels: ['Not Related', 'Somewhat', 'Very Related'],
    weight: 0.8,
    inverseScoring: false
  },
  
  // Strategic & Long-term
  {
    key: 'long_term_goals',
    name: 'Long-term Goals',
    description: 'How well does this task align with your long-term goals?',
    scaleLabels: ['Not Aligned', 'Somewhat', 'Well Aligned'],
    weight: 0.9,
    inverseScoring: false
  },
  {
    key: 'strategic_importance',
    name: 'Strategic Importance',
    description: 'How important is this task for your overall strategy or plans?',
    scaleLabels: ['Not Important', 'Somewhat', 'Very Important'],
    weight: 1.0,
    inverseScoring: false
  },
  {
    key: 'maintenance_vs_growth',
    name: 'Maintenance vs Growth',
    description: 'Is this task maintaining current state or driving growth?',
    scaleLabels: ['Maintenance', 'Mixed', 'Growth'],
    weight: 0.8,
    inverseScoring: false
  },
  
  // External Dependencies & Risk
  {
    key: 'team_dependencies',
    name: 'Team Dependencies',
    description: 'How much does this task depend on or affect other people?',
    scaleLabels: ['Independent', 'Some Deps', 'High Deps'],
    weight: 0.9,
    inverseScoring: false
  },
  {
    key: 'customer_impact',
    name: 'Customer Impact',
    description: 'How much will this task affect customers or end users?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 1.1,
    inverseScoring: false
  },
  {
    key: 'risk_level',
    name: 'Risk Level',
    description: 'What is the risk if this task goes wrong or fails?',
    scaleLabels: ['Low Risk', 'Some Risk', 'High Risk'],
    weight: 0.7,
    inverseScoring: true // High risk = lower priority
  },
  {
    key: 'visibility_recognition',
    name: 'Visibility/Recognition',
    description: 'Will this task be noticed or recognized by others?',
    scaleLabels: ['Low Visibility', 'Some Visibility', 'High Visibility'],
    weight: 0.6,
    inverseScoring: false
  },
  
  // Social & Environmental
  {
    key: 'social_impact',
    name: 'Social Impact',
    description: 'Does this task benefit others or contribute to society?',
    scaleLabels: ['No Impact', 'Some Impact', 'High Impact'],
    weight: 0.7,
    inverseScoring: false
  },
  {
    key: 'environmental_impact',
    name: 'Environmental Impact',
    description: 'Does this task affect the environment positively or negatively?',
    scaleLabels: ['No Effect', 'Some Effect', 'Major Effect'],
    weight: 0.6,
    inverseScoring: false
  }
];

export const DEFAULT_WEIGHTS: ScoringWeights = {
  time_sensitivity: 1.0,
  deadline_pressure: 1.1,
  impact: 1.2,
  financial_impact: 1.3,
  career_impact: 1.0,
  relationship_impact: 0.9,
  effort: 0.8,
  energy_level: 0.7,
  creativity_required: 0.6,
  personal_growth: 0.8,
  learning_opportunity: 0.7,
  skill_building: 0.8,
  health_wellness: 1.0,
  stress_level: 0.6,
  enjoyment_factor: 0.5,
  family_time: 0.9,
  self_care: 0.8,
  long_term_goals: 0.9,
  strategic_importance: 1.0,
  maintenance_vs_growth: 0.8,
  team_dependencies: 0.9,
  customer_impact: 1.1,
  risk_level: 0.7,
  visibility_recognition: 0.6,
  social_impact: 0.7,
  environmental_impact: 0.6
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