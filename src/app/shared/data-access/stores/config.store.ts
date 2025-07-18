import { Injectable, signal, computed } from '@angular/core';
import { AppConfig, EvaluationCategory } from '../models';
import { DEFAULT_CONFIG } from '../config';

@Injectable({
  providedIn: 'root'
})
export class ConfigStore {
  private configSignal = signal<AppConfig>(DEFAULT_CONFIG);
  
  // Public readonly signals
  readonly config = this.configSignal.asReadonly();
  readonly categories = computed(() => this.config().categories);
  readonly weights = computed(() => this.config().defaultWeights);
  readonly uiConfig = computed(() => this.config().ui);
  readonly parsingConfig = computed(() => this.config().parsing);
  readonly exportConfig = computed(() => this.config().export);
  
  // Category helpers
  readonly categoryCount = computed(() => this.categories().length);
  readonly categoryKeys = computed(() => this.categories().map(c => c.key));
  readonly categoryMap = computed(() => {
    const map = new Map<string, EvaluationCategory>();
    this.categories().forEach(cat => map.set(cat.key, cat));
    return map;
  });
  
  // Actions
  updateConfig(newConfig: Partial<AppConfig>): void {
    this.configSignal.update(current => ({
      ...current,
      ...newConfig
    }));
  }
  
  updateCategory(categoryKey: string, updates: Partial<EvaluationCategory>): void {
    this.configSignal.update(current => ({
      ...current,
      categories: current.categories.map(cat => 
        cat.key === categoryKey ? { ...cat, ...updates } : cat
      )
    }));
  }
  
  updateWeight(categoryKey: string, weight: number): void {
    this.configSignal.update(current => ({
      ...current,
      defaultWeights: {
        ...current.defaultWeights,
        [categoryKey]: weight
      }
    }));
  }
  
  resetToDefaults(): void {
    this.configSignal.set(DEFAULT_CONFIG);
  }
  
  getCategoryByKey(key: string): EvaluationCategory | undefined {
    return this.categoryMap().get(key);
  }
}