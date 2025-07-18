export interface Task {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskEvaluation {
  [categoryKey: string]: 1 | 2 | 3;
}

export interface TaskScore {
  taskId: string;
  evaluation: TaskEvaluation;
  weightedScore: number;
  priorityRank: number;
  reasoning: string;
}

export interface BrainDumpInput {
  rawText: string;
  extractedTasks: string[];
  processingNotes: string[];
}