// src/services/ollama.ts
// Simple type definitions for Ollama integration

export interface ProcessingStatus {
  stage: 'initializing' | 'analyzing_images' | 'extracting_text' | 'generating_solution' | 'finalizing' | 'complete' | 'error';
  message: string;
  progress?: number;
}