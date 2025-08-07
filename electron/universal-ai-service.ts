// Universal AI Service for handling multiple AI models and modalities
import { ElectronOllamaService } from './ollama-service';

export interface AIModelConfig {
  type: 'text' | 'vision' | 'audio' | 'multimodal';
  provider: 'ollama' | 'openai' | 'anthropic' | 'custom';
  model: string;
  endpoint?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamingCallback {
  onChunk?: (chunk: string) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (result: string) => void;
  onError?: (error: string) => void;
}

export interface AIRequest {
  type: 'text' | 'image' | 'audio' | 'multimodal';
  content: string | Buffer | string[]; // text, image buffer, or multiple inputs
  context?: string;
  images?: string[]; // base64 images for vision models
  audioData?: Buffer; // audio buffer for audio models
}

export interface AIResponse {
  text: string;
  timestamp: number;
  metadata: {
    model: string;
    provider: string;
    processingTime: number;
    type: string;
    cached?: boolean;
  };
}

export class UniversalAIService {
  private ollamaService: ElectronOllamaService;
  private modelConfigs: Map<string, AIModelConfig> = new Map();
  private responseCache: Map<string, { response: string; timestamp: number }> = new Map();
  private streamingCallbacks: Map<string, StreamingCallback> = new Map();

  constructor() {
    this.ollamaService = new ElectronOllamaService();
    this.initializeDefaultModels();
  }

  private initializeDefaultModels() {
    // Default Ollama models
    this.registerModel('llama3.2-vision', {
      type: 'vision',
      provider: 'ollama',
      model: 'llama3.2-vision',
      temperature: 0.7
    });

    this.registerModel('llama3.2', {
      type: 'text',
      provider: 'ollama',
      model: 'llama3.2',
      temperature: 0.7
    });

    // Future models can be added here
    this.registerModel('whisper', {
      type: 'audio',
      provider: 'ollama',
      model: 'whisper',
      temperature: 0.1
    });
  }

  registerModel(name: string, config: AIModelConfig) {
    this.modelConfigs.set(name, config);
  }

  setStreamingCallback(requestId: string, callbacks: StreamingCallback) {
    this.streamingCallbacks.set(requestId, callbacks);
  }

  private getCacheKey(request: AIRequest, modelName: string): string {
    const contentHash = typeof request.content === 'string' 
      ? request.content 
      : JSON.stringify(request.content);
    return `${modelName}:${request.type}:${contentHash}:${request.context || ''}`;
  }

  private async checkCache(cacheKey: string): Promise<string | null> {
    const cached = this.responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 3600000) { // 1 hour cache
      return cached.response;
    }
    return null;
  }

  private cacheResponse(cacheKey: string, response: string) {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.responseCache.size > 200) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }
  }

  async processRequest(
    request: AIRequest, 
    modelName: string = 'llama3.2-vision',
    requestId?: string
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const modelConfig = this.modelConfigs.get(modelName);
    
    if (!modelConfig) {
      throw new Error(`Model ${modelName} not registered`);
    }

    const cacheKey = this.getCacheKey(request, modelName);
    
    // Check cache first
    const cachedResponse = await this.checkCache(cacheKey);
    if (cachedResponse) {
      const callbacks = requestId ? this.streamingCallbacks.get(requestId) : null;
      if (callbacks?.onComplete) {
        callbacks.onComplete(cachedResponse);
      }
      
      return {
        text: cachedResponse,
        timestamp: Date.now(),
        metadata: {
          model: modelName,
          provider: modelConfig.provider,
          processingTime: Date.now() - startTime,
          type: request.type,
          cached: true
        }
      };
    }

    // Set up streaming for this request
    if (requestId) {
      const callbacks = this.streamingCallbacks.get(requestId);
      if (callbacks) {
        this.ollamaService.setStreamingCallback((partialText: string) => {
          callbacks.onChunk?.(partialText);
        });
      }
    }

    let response: AIResponse;

    switch (modelConfig.provider) {
      case 'ollama':
        response = await this.processOllamaRequest(request, modelConfig, startTime);
        break;
      
      // Future providers can be added here
      case 'openai':
        response = await this.processOpenAIRequest(request, modelConfig, startTime);
        break;
        
      case 'anthropic':
        response = await this.processAnthropicRequest(request, modelConfig, startTime);
        break;
        
      default:
        throw new Error(`Provider ${modelConfig.provider} not implemented`);
    }

    // Cache the response
    this.cacheResponse(cacheKey, response.text);

    // Notify completion
    if (requestId) {
      const callbacks = this.streamingCallbacks.get(requestId);
      if (callbacks?.onComplete) {
        callbacks.onComplete(response.text);
      }
      this.streamingCallbacks.delete(requestId);
    }

    return response;
  }

  private async processOllamaRequest(
    request: AIRequest, 
    config: AIModelConfig, 
    startTime: number
  ): Promise<AIResponse> {
    switch (request.type) {
      case 'text':
        const textResponse = await this.ollamaService.askQuestion(
          request.content as string, 
          request.context
        );
        return {
          ...textResponse,
          metadata: {
            model: config.model,
            provider: 'ollama',
            processingTime: Date.now() - startTime,
            type: 'text'
          }
        };

      case 'image':
      case 'multimodal':
        if (request.images && request.images.length > 0) {
          // Use vision model for image analysis
          const visionResponse = await this.ollamaService.processInterviewQuestion(
            request.images, // Assuming these are file paths
            request.context
          );
          return {
            text: visionResponse.text,
            timestamp: visionResponse.timestamp,
            metadata: {
              model: config.model,
              provider: 'ollama',
              processingTime: Date.now() - startTime,
              type: 'vision'
            }
          };
        }
        break;

      case 'audio':
        if (request.audioData) {
          // Future: implement audio processing with Ollama
          // For now, return a placeholder
          return {
            text: 'Audio transcription not yet implemented',
            timestamp: Date.now(),
            metadata: {
              model: config.model,
              provider: 'ollama',
              processingTime: Date.now() - startTime,
              type: 'audio'
            }
          };
        }
        break;
    }

    throw new Error(`Request type ${request.type} not supported for Ollama`);
  }

  // Placeholder for future OpenAI integration
  private async processOpenAIRequest(
    request: AIRequest, 
    config: AIModelConfig, 
    startTime: number
  ): Promise<AIResponse> {
    // Future implementation for OpenAI API
    throw new Error('OpenAI provider not yet implemented');
  }

  // Placeholder for future Anthropic integration
  private async processAnthropicRequest(
    request: AIRequest, 
    config: AIModelConfig, 
    startTime: number
  ): Promise<AIResponse> {
    // Future implementation for Anthropic API
    throw new Error('Anthropic provider not yet implemented');
  }

  // Get available models
  getAvailableModels(): Array<{ name: string; config: AIModelConfig }> {
    return Array.from(this.modelConfigs.entries()).map(([name, config]) => ({
      name,
      config
    }));
  }

  // Check if a model supports a specific type
  supportsType(modelName: string, type: 'text' | 'image' | 'audio' | 'multimodal'): boolean {
    const config = this.modelConfigs.get(modelName);
    if (!config) return false;
    
    return config.type === type || config.type === 'multimodal';
  }
}

export const universalAIService = new UniversalAIService();