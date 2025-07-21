import { GeminiModel } from '../lib/llm/llm.types';

export const environment = {
  production: false,
  llm: {
    gemini: 'AIzaSyA6rrPGUYoM-70DXJrGVcBbqSdwNZAduRE',
    defaultModel: 'gemini-1.5-flash-8b' as GeminiModel,
    enableFallback: true,
    maxRetries: 3
  },
};
