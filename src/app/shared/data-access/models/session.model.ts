import { Task, TaskEvaluation, TaskScore } from './task.model';
import { CategoryProgress } from './evaluation.model';

export enum MainPageState {
  BRAIN_DUMP = 'brain_dump',
  CATEGORY_SELECTION = 'category_selection',
  CATEGORY_OVERVIEW = 'category_overview',
  RESULTS = 'results',
  NOTE_INPUT = 'note_input',
  EVENT_GENERATION = 'event_generation',
  EVENT_SELECTION = 'event_selection',
  CALENDAR_VIEW = 'calendar_view'
}

export interface TriageSession {
  id: string;
  tasks: Task[];
  selectedCategories: string[]; // Array of category keys selected by user
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