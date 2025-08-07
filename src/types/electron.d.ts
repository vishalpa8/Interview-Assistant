// Global type definitions for electronAPI

// Define the complete ElectronAPI interface
interface ElectronAPI {
  // Window management
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>;
  
  // Screenshot functionality
  getScreenshots: () => Promise<{ path: string; preview: string }[]>;
  takeScreenshot: () => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteScreenshot: (path: string) => Promise<{ success: boolean; error?: string }>;
  
  // Event listeners for screenshots
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => () => void;
  
  // Global events
  onUnauthorized: (callback: () => void) => () => void;
  onProcessingNoScreenshots: (callback: () => void) => () => void;
  onResetView: (callback: () => void) => () => void;
  
  // Solution processing events
  onSolutionStart: (callback: () => void) => () => void;
  onSolutionError: (callback: (error: string) => void) => () => void;
  onSolutionSuccess: (callback: (data: any) => void) => () => void;
  onProblemExtracted: (callback: (data: any) => void) => () => void;
  
  // Debug events
  onDebugStart: (callback: () => void) => () => void;
  onDebugSuccess: (callback: (data: any) => void) => () => void;
  onDebugError: (callback: (error: string) => void) => () => void;
  
  // Audio processing
  analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>;
  analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>;
  
  // Universal AI functionality
  askQuestion: (question: string, options?: any) => Promise<{ success: boolean; answer?: { text: string; timestamp: number }; error?: string; metadata?: any }>;
  processImages: (imagePaths: string[], options?: any) => Promise<{ success: boolean; result?: any; error?: string }>;
  processAudio: (audioData: any, options?: any) => Promise<{ success: boolean; result?: any; error?: string }>;
  getAvailableModels: () => Promise<{ success: boolean; models?: Array<{ name: string; config: any }>; error?: string }>;
  
  // Streaming response events
  onStreamingResponse: (callback: (partialText: string) => void) => () => void;
  onStreamingComplete: (callback: (finalText: string) => void) => () => void;
  onStreamingError: (callback: (error: string) => void) => () => void;
  removeStreamingListeners: () => void;
  
  // Ollama-specific functionality
  processInterview: (additionalContext?: string) => Promise<{ success: boolean; result?: any; error?: string }>;
  checkOllamaConnection: () => Promise<{ success: boolean; error?: string }>;
  
  // Processing status events
  onProcessingStatus: (callback: (status: any) => void) => () => void;
  
  // Window movement
  moveWindowLeft: () => Promise<void>;
  moveWindowRight: () => Promise<void>;
  
  // App control
  quitApp: () => Promise<void>;
  hideWindow: () => Promise<void>;
  solutionStart?: () => Promise<void>;
  
  // Platform info
  platform: string;
  
  // Enhanced solution processing
  startSolutionProcessing: () => Promise<void>;
}

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Export the interface for use in other files
export type { ElectronAPI };
export {};