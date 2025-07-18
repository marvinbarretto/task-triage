import { Injectable } from '@angular/core';
import { Task, TaskEvaluation, TaskScore, ScoringWeights, EvaluationCategory } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ScoringService {
  
  calculateScores(
    tasks: Task[], 
    evaluations: Map<string, Partial<TaskEvaluation>>, 
    weights: ScoringWeights,
    categories: EvaluationCategory[]
  ): TaskScore[] {
    const scores: TaskScore[] = [];
    
    tasks.forEach((task, index) => {
      const evaluation = evaluations.get(task.id);
      if (!evaluation) {
        // Task hasn't been evaluated yet
        scores.push({
          taskId: task.id,
          evaluation: {},
          weightedScore: 0,
          priorityRank: tasks.length, // Put unscored items at the end
          reasoning: 'Not yet evaluated'
        });
        return;
      }
      
      let totalScore = 0;
      let totalWeight = 0;
      const scoringFactors: string[] = [];
      
      categories.forEach(category => {
        const rating = evaluation[category.key];
        if (rating !== undefined) {
          const categoryWeight = weights[category.key] || category.weight;
          let normalizedRating = rating; // 1-3 scale
          
          // Apply inverse scoring if configured (e.g., for effort)
          if (category.inverseScoring) {
            normalizedRating = 4 - rating; // 3->1, 2->2, 1->3
          }
          
          const categoryScore = normalizedRating * categoryWeight;
          totalScore += categoryScore;
          totalWeight += categoryWeight;
          
          // Add to reasoning
          const ratingLabel = this.getRatingLabel(category.key, rating, categories);
          scoringFactors.push(`${category.name}: ${ratingLabel} (${normalizedRating}×${categoryWeight})`);
        }
      });
      
      // Calculate weighted average (0-3 scale, then multiply by 10 for friendlier numbers)
      const weightedScore = totalWeight > 0 ? (totalScore / totalWeight) * 10 : 0;
      
      // Generate reasoning
      const reasoning = this.generateReasoning(scoringFactors, weightedScore, categories.length);
      
      scores.push({
        taskId: task.id,
        evaluation: evaluation as TaskEvaluation,
        weightedScore: Math.round(weightedScore * 10) / 10, // Round to 1 decimal
        priorityRank: 0, // Will be set after sorting
        reasoning
      });
    });
    
    // Sort by score and assign ranks
    scores.sort((a, b) => b.weightedScore - a.weightedScore);
    scores.forEach((score, index) => {
      score.priorityRank = index + 1;
    });
    
    return scores;
  }
  
  private getRatingLabel(categoryKey: string, rating: 1 | 2 | 3, categories: EvaluationCategory[]): string {
    const category = categories.find(c => c.key === categoryKey);
    if (!category) return rating.toString();
    
    return category.scaleLabels[rating - 1]; // Convert 1-3 to 0-2 index
  }
  
  private generateReasoning(factors: string[], score: number, totalCategories: number): string {
    if (factors.length === 0) {
      return 'No evaluations completed yet';
    }
    
    if (factors.length < totalCategories) {
      return `Partial evaluation (${factors.length}/${totalCategories} categories): ${factors.join(', ')}`;
    }
    
    // Full evaluation - provide strategic reasoning
    if (score >= 25) {
      return `High priority: ${this.getTopFactors(factors, 2).join(' + ')}`;
    } else if (score >= 20) {
      return `Medium-high priority: ${this.getTopFactors(factors, 2).join(' + ')}`;
    } else if (score >= 15) {
      return `Medium priority: ${factors.length > 2 ? this.getTopFactors(factors, 1)[0] : factors.join(', ')}`;
    } else if (score >= 10) {
      return `Lower priority: ${factors.length > 1 ? 'Mixed factors' : factors[0]}`;
    } else {
      return `Low priority: ${factors.length > 1 ? 'Generally low scores' : factors[0]}`;
    }
  }
  
  private getTopFactors(factors: string[], count: number): string[] {
    // This is a simplified approach - in a real implementation,
    // you'd parse the factor strings to identify highest-impact categories
    return factors.slice(0, count);
  }
  
  // Calculate what the score would be if a specific rating were applied
  predictScore(
    task: Task,
    currentEvaluation: Partial<TaskEvaluation>,
    categoryKey: string,
    rating: 1 | 2 | 3,
    weights: ScoringWeights,
    categories: EvaluationCategory[]
  ): number {
    const tempEvaluation = {
      ...currentEvaluation,
      [categoryKey]: rating
    };
    
    const tempMap = new Map([[task.id, tempEvaluation]]);
    const scores = this.calculateScores([task], tempMap, weights, categories);
    
    return scores[0]?.weightedScore || 0;
  }
  
  // Get insights about scoring distribution
  getScoreDistribution(scores: TaskScore[]): {
    high: number;
    medium: number;
    low: number;
    average: number;
    range: number;
  } {
    if (scores.length === 0) {
      return { high: 0, medium: 0, low: 0, average: 0, range: 0 };
    }
    
    const validScores = scores.filter(s => s.weightedScore > 0);
    const scoreValues = validScores.map(s => s.weightedScore);
    
    const high = scoreValues.filter(s => s >= 25).length;
    const medium = scoreValues.filter(s => s >= 15 && s < 25).length;
    const low = scoreValues.filter(s => s < 15).length;
    
    const average = scoreValues.length > 0 ? 
      scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length : 0;
    
    const range = scoreValues.length > 0 ? 
      Math.max(...scoreValues) - Math.min(...scoreValues) : 0;
    
    return {
      high,
      medium,
      low,
      average: Math.round(average * 10) / 10,
      range: Math.round(range * 10) / 10
    };
  }
}