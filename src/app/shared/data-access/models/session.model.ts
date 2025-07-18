import { Task, TaskEvaluation, TaskScore } from './task.model';
import { CategoryProgress } from './evaluation.model';

export enum MainPageState {
  BRAIN_DUMP = 'brain_dump',
  CATEGORY_OVERVIEW = 'category_overview',
  RESULTS = 'results'
}

export interface TriageSession {
  id: string;
  tasks: Task[];
  evaluations: Map<string, Partial<TaskEvaluation>>;
  categoryProgress: CategoryProgress;
  currentState: MainPageState;
  canShowResults: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionSummary {
  id: string;
  taskCount: number;
  completedCategories: number;
  totalCategories: number;
  createdAt: Date;
  updatedAt: Date;
}