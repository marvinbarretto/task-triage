import { EvaluationCategory, ScoringWeights } from './evaluation.model';

export interface UIConfiguration {
  appTitle: string;
  brainDumpPlaceholder: string;
  maxTasksPerSession: number;
  enableProgressIndicators: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface ExportConfiguration {
  defaultFormat: 'text' | 'json' | 'csv' | 'markdown';
  includeScoring: boolean;
  includeTimestamps: boolean;
  customFormats: ExportFormat[];
}

export interface ExportFormat {
  key: string;
  name: string;
  extension: string;
  template: string;
}

export interface ParsingConfiguration {
  bulletPoints: string[];
  numberedLists: boolean;
  lineBreakSeparated: boolean;
  customDelimiters: string[];
  minTaskLength: number;
  maxTaskLength: number;
}

export interface AppConfig {
  categories: EvaluationCategory[];
  defaultWeights: ScoringWeights;
  ui: UIConfiguration;
  export: ExportConfiguration;
  parsing: ParsingConfiguration;
  version: string;
}