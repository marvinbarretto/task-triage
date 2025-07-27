import { InjectionToken } from '@angular/core';
import { GeminiModel } from './llm.types';

export interface LLMConfig {
  gemini: string;
  defaultModel?: GeminiModel;
  enableFallback?: boolean;
  maxRetries?: number;
}

export const LLM_CONFIG = new InjectionToken<LLMConfig>('LLM_CONFIG');

export const DEFAULT_LLM_CONFIG: Partial<LLMConfig> = {
  defaultModel: 'gemini-1.5-flash-8b' as GeminiModel,
  enableFallback: true,
  maxRetries: 3
};