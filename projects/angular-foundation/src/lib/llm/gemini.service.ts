import { Injectable, signal, inject } from '@angular/core';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMRequest, LLMResponse, GeminiModel, MODEL_CONFIGS, MODEL_FALLBACK_ORDER } from './llm.types';
import { LLM_CONFIG, LLMConfig, DEFAULT_LLM_CONFIG } from './llm-config';

@Injectable({
  providedIn: 'root'
})
export class LLMService {
  private readonly config = inject(LLM_CONFIG);
  private readonly _genAI = new GoogleGenerativeAI(this.config.gemini);
  private readonly _modelCache = new Map<GeminiModel, GenerativeModel>();
  private _defaultModel: GeminiModel = this.config.defaultModel || DEFAULT_LLM_CONFIG.defaultModel!

  // Simple cache for testing - TEMPORARILY DISABLED
  // Cache was causing permanent blocking after rejections due to weak cache key
  // and caching of negative results. Re-enable once improved.
  private readonly _cache = new Map<string, any>();

  // Basic state tracking
  private readonly _isProcessing = signal(false);
  private readonly _requestCount = signal(0);

  readonly isProcessing = this._isProcessing.asReadonly();
  readonly requestCount = this._requestCount.asReadonly();

  /**
   * Get or create a GenerativeModel instance for the specified model
   */
  private getModel(modelName: GeminiModel): GenerativeModel {
    if (!this._modelCache.has(modelName)) {
      console.log(`[LLMService] Creating new model instance: ${modelName}`);
      const model = this._genAI.getGenerativeModel({ 
        model: modelName === 'gemini-pro' ? 'gemini-1.0-pro' : modelName
      });
      this._modelCache.set(modelName, model);
    }
    return this._modelCache.get(modelName)!;
  }

  /**
   * Generate content with automatic model fallback
   */
  async generateContent(request: LLMRequest): Promise<LLMResponse<string>>;
  async generateContent(prompt: string, model?: GeminiModel): Promise<LLMResponse<string>>;
  async generateContent(requestOrPrompt: LLMRequest | string, model?: GeminiModel): Promise<LLMResponse<string>> {
    const startTime = Date.now();
    
    // Normalize input
    const request: LLMRequest = typeof requestOrPrompt === 'string' 
      ? { prompt: requestOrPrompt, model } 
      : requestOrPrompt;
    
    const targetModel = request.model || model || this._defaultModel;
    
    console.log(`[LLMService] Generating content with model: ${targetModel}`);
    console.log(`[LLMService] Prompt: "${request.prompt.substring(0, 100)}..."`);

    this._isProcessing.set(true);

    try {
      const response = await this.tryGenerateWithFallback(request, targetModel);
      const processingTime = Date.now() - startTime;
      
      this._requestCount.update(count => count + 1);
      
      console.log(`[LLMService] ✅ Content generated successfully in ${processingTime}ms`);
      
      return {
        ...response,
        processingTime
      };

    } catch (error: any) {
      console.error('[LLMService] ❌ All models failed:', error);

      return {
        success: false,
        data: '',
        error: error?.message || 'Content generation failed',
        cached: false,
        modelUsed: targetModel,
        processingTime: Date.now() - startTime
      };
    } finally {
      this._isProcessing.set(false);
    }
  }

  /**
   * Test method - simple text prompt (backward compatibility)
   */
  async testConnection(prompt: string = "Hello, are you working?", model?: GeminiModel): Promise<LLMResponse<string>> {
    return this.generateContent(prompt, model);
  }

  /**
   * Try generating content with fallback to other models
   */
  private async tryGenerateWithFallback(request: LLMRequest, preferredModel: GeminiModel): Promise<LLMResponse<string>> {
    // Create fallback order starting with preferred model
    const fallbackOrder = [preferredModel, ...MODEL_FALLBACK_ORDER.filter(m => m !== preferredModel)];
    
    let lastError: Error | null = null;
    
    for (const modelName of fallbackOrder) {
      try {
        console.log(`[LLMService] Trying model: ${modelName}`);
        
        const model = this.getModel(modelName);
        const result = await model.generateContent(request.prompt);
        const response = result.response.text();
        
        console.log(`[LLMService] ✅ Success with model: ${modelName}`);
        
        return {
          success: true,
          data: response,
          cached: false,
          modelUsed: modelName
        };
        
      } catch (error: any) {
        console.warn(`[LLMService] Model ${modelName} failed:`, error?.message);
        lastError = error;
        
        // If it's a 503/overloaded error, try next model
        if (error?.message?.includes('overloaded') || error?.message?.includes('503')) {
          continue;
        }
        
        // For other errors, still try fallbacks but log differently
        if (!error?.message?.includes('API_KEY') && !error?.message?.includes('authentication')) {
          continue;
        }
        
        // For auth errors, don't bother with fallbacks
        throw error;
      }
    }
    
    // All models failed
    throw lastError || new Error('All models failed');
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Convert File to base64 data URL
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * ✅ IMAGE OPTIMIZATION - Major cost savings!
   * Resizes images to optimal size for LLM analysis
   */
  private async optimizeImageForAnalysis(imageData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      // ✅ Optimal dimensions for carpet pattern recognition
      const targetWidth = 512;
      const targetHeight = 384;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      img.onload = () => {
        console.log(`[LLMService] Original image: ${img.width}x${img.height}`);

        // Draw resized image
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // ✅ Compress with good quality (0.8 = good balance)
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

        console.log(`[LLMService] Optimized to: ${targetWidth}x${targetHeight}`);
        console.log(`[LLMService] Size reduction: ~${Math.round((1 - optimizedDataUrl.length / imageData.length) * 100)}%`);

        resolve(optimizedDataUrl);
      };

      img.onerror = () => {
        console.log('[LLMService] Failed to load image for optimization');
        reject(new Error('Image optimization failed'));
      };

      img.src = imageData;
    });
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // ===== DEBUG/TESTING METHODS =====

  // ===== PUBLIC UTILITY METHODS =====

  /**
   * Set the default model for all requests
   */
  setDefaultModel(model: GeminiModel): void {
    console.log(`[LLMService] Default model changed: ${this._defaultModel} → ${model}`);
    this._defaultModel = model;
  }

  /**
   * Get the current default model
   */
  getDefaultModel(): GeminiModel {
    return this._defaultModel;
  }

  /**
   * Get available models with their configurations
   */
  getAvailableModels(): typeof MODEL_CONFIGS {
    return MODEL_CONFIGS;
  }

  /**
   * Get model configuration by name
   */
  getModelConfig(model: GeminiModel): typeof MODEL_CONFIGS[GeminiModel] {
    return MODEL_CONFIGS[model];
  }

  /**
   * Get model fallback order
   */
  getFallbackOrder(): GeminiModel[] {
    return [...MODEL_FALLBACK_ORDER];
  }

  getStats() {
    return {
      requestCount: this._requestCount(),
      cacheSize: this._cache.size,
      isProcessing: this._isProcessing(),
      defaultModel: this._defaultModel,
      cachedModels: Array.from(this._modelCache.keys()),
      modelConfigs: MODEL_CONFIGS
    };
  }

  clearCache() {
    this._cache.clear();
    console.log('[LLMService] Cache cleared');
  }

  /**
   * Clear model instances cache (force recreation)
   */
  clearModelCache(): void {
    this._modelCache.clear();
    console.log('[LLMService] Model cache cleared - instances will be recreated');
  }

}
