// Supported Gemini models with cost and performance characteristics
export type GeminiModel = 
  | 'gemini-1.5-flash-8b'    // Cheapest, fastest, good for simple tasks
  | 'gemini-1.5-flash'       // Standard performance, balanced cost
  | 'gemini-1.0-pro'         // Most stable and reliable
  | 'gemini-pro';            // Alias for gemini-1.0-pro

export interface ModelConfig {
  name: GeminiModel;
  costTier: 'low' | 'medium' | 'high';
  reliability: 'high' | 'medium' | 'low';
  speed: 'fast' | 'medium' | 'slow';
  description: string;
}

export type LLMRequest = {
  prompt: string;
  image?: string; // base64 data URL
  model?: GeminiModel; // Optional model selection
  temperature?: number; // Model creativity (0-1)
  maxTokens?: number; // Response length limit
};

export type LLMResponse<T = any> = {
  success: boolean;
  data: T;
  error?: string;
  tokensUsed?: number;
  cached: boolean;
  modelUsed?: GeminiModel; // Which model was actually used
  processingTime?: number; // Response time in ms
};

export type LLMStreamChunk = {
  text: string;
  isComplete: boolean;
  chunkIndex: number;
};

export type LLMStreamResponse<T = any> = {
  success: boolean;
  stream: AsyncIterable<LLMStreamChunk>;
  error?: string;
  cached: boolean;
  modelUsed?: GeminiModel;
};

// Model configurations for cost and reliability optimization
export const MODEL_CONFIGS: Record<GeminiModel, ModelConfig> = {
  'gemini-1.5-flash-8b': {
    name: 'gemini-1.5-flash-8b',
    costTier: 'low',
    reliability: 'medium',
    speed: 'fast',
    description: 'Cheapest and fastest model, ideal for simple tasks'
  },
  'gemini-1.5-flash': {
    name: 'gemini-1.5-flash',
    costTier: 'medium',
    reliability: 'medium',
    speed: 'medium',
    description: 'Balanced performance and cost for general use'
  },
  'gemini-1.0-pro': {
    name: 'gemini-1.0-pro',
    costTier: 'medium',
    reliability: 'high',
    speed: 'medium',
    description: 'Most stable and reliable, best for critical tasks'
  },
  'gemini-pro': {
    name: 'gemini-pro',
    costTier: 'medium',
    reliability: 'high',
    speed: 'medium',
    description: 'Alias for gemini-1.0-pro'
  }
};

// Model fallback hierarchy for reliability
export const MODEL_FALLBACK_ORDER: GeminiModel[] = [
  'gemini-1.5-flash-8b', // Try cheapest first
  'gemini-1.5-flash',    // Standard fallback
  'gemini-1.0-pro'       // Most reliable fallback
];
