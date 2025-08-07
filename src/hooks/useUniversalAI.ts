/// <reference path="../types/electron.d.ts" />
import { useState, useEffect, useCallback } from 'react';
import type { ElectronAPI } from '../types/electron';

export interface AIModel {
  name: string;
  config: {
    type: 'text' | 'vision' | 'audio' | 'multimodal';
    provider: string;
    model: string;
  };
}

export interface UseUniversalAIOptions {
  model?: string;
  enableStreaming?: boolean;
  enableCaching?: boolean;
}

export interface AIRequest {
  type: 'text' | 'image' | 'audio';
  content: string;
  context?: string;
  images?: string[];
  audioData?: any;
}

export const useUniversalAI = (options: UseUniversalAIOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');

  // Load available models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const electronAPI = window.electronAPI as ElectronAPI;
        const response = await electronAPI.getAvailableModels();
        if (response.success && response.models) {
          setAvailableModels(response.models);
        }
      } catch (err) {
        console.error('Failed to load AI models:', err);
      }
    };

    loadModels();
  }, []);

  // Set up streaming listeners
  useEffect(() => {
    if (!options.enableStreaming) return;

    const electronAPI = window.electronAPI as ElectronAPI;
    const unsubscribeStreaming = electronAPI.onStreamingResponse((partialText: string) => {
      setIsStreaming(true);
      setIsProcessing(false);
      setStreamingText(partialText);
      setResult(partialText);
    });

    const unsubscribeComplete = electronAPI.onStreamingComplete((finalText: string) => {
      setIsStreaming(false);
      setResult(finalText);
      setStreamingText('');
    });

    const unsubscribeError = electronAPI.onStreamingError((errorMsg: string) => {
      setIsStreaming(false);
      setIsProcessing(false);
      setError(errorMsg);
    });

    return () => {
      unsubscribeStreaming?.();
      unsubscribeComplete?.();
      unsubscribeError?.();
    };
  }, [options.enableStreaming]);

  const processText = useCallback(async (
    question: string, 
    context?: string,
    modelOverride?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStreamingText('');

    try {
      const electronAPI = window.electronAPI as ElectronAPI;
      const response = await electronAPI.askQuestion(question, {
        context,
        model: modelOverride || options.model
      });

      if (response.success && response.answer) {
        if (!options.enableStreaming) {
          setResult(response.answer.text);
        }
        return response.answer.text;
      } else {
        setError(response.error || 'Failed to process text');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      if (!options.enableStreaming) {
        setIsProcessing(false);
      }
    }
  }, [options.model, options.enableStreaming]);

  const processImages = useCallback(async (
    imagePaths: string[],
    prompt?: string,
    context?: string,
    modelOverride?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStreamingText('');

    try {
      const electronAPI = window.electronAPI as ElectronAPI;
      const response = await electronAPI.processImages(imagePaths, {
        prompt,
        context,
        model: modelOverride || options.model
      });

      if (response.success && response.result) {
        if (!options.enableStreaming) {
          setResult(response.result.text);
        }
        return response.result.text;
      } else {
        setError(response.error || 'Failed to process images');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      if (!options.enableStreaming) {
        setIsProcessing(false);
      }
    }
  }, [options.model, options.enableStreaming]);

  const processAudio = useCallback(async (
    audioData: any,
    context?: string,
    modelOverride?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStreamingText('');

    try {
      const electronAPI = window.electronAPI as ElectronAPI;
      const response = await electronAPI.processAudio(audioData, {
        context,
        model: modelOverride || options.model
      });

      if (response.success && response.result) {
        if (!options.enableStreaming) {
          setResult(response.result.text);
        }
        return response.result.text;
      } else {
        setError(response.error || 'Failed to process audio');
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      if (!options.enableStreaming) {
        setIsProcessing(false);
      }
    }
  }, [options.model, options.enableStreaming]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setStreamingText('');
    setIsStreaming(false);
    setIsProcessing(false);
  }, []);

  const getModelsByType = useCallback((type: 'text' | 'vision' | 'audio' | 'multimodal') => {
    return availableModels.filter(model => 
      model.config.type === type || model.config.type === 'multimodal'
    );
  }, [availableModels]);

  return {
    // State
    isProcessing,
    isStreaming,
    result,
    error,
    streamingText,
    availableModels,

    // Actions
    processText,
    processImages,
    processAudio,
    clearResult,
    getModelsByType,

    // Utilities
    supportsStreaming: options.enableStreaming,
    currentModel: options.model
  };
};

export default useUniversalAI;