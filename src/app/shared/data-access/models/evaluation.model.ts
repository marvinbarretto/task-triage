export interface EvaluationCategory {
  key: string;
  name: string;
  description: string;
  scaleLabels: [string, string, string]; // ["Low", "Medium", "High"]
  weight: number;
  inverseScoring?: boolean; // For effort (high effort = lower priority)
}

export interface ScoringWeights {
  [categoryKey: string]: number;
}

export interface CategoryProgress {
  categories: Record<string, boolean>;
  completedCount: number;
}