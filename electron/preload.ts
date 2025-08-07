import { contextBridge, ipcRenderer } from 'electron';

// Expose the complete electronAPI that the React app expects
contextBridge.exposeInMainWorld('electronAPI', {
  // Window management
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke('update-content-dimensions', dimensions),

  // Screenshot functionality
  getScreenshots: () => ipcRenderer.invoke('get-screenshots'),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  deleteScreenshot: (path: string) => ipcRenderer.invoke('delete-screenshot', path),

  // Event listeners for screenshots
  onScreenshotTaken: (callback: (data: { path: string; preview: string }) => void) => {
    const subscription = (_: any, data: { path: string; preview: string }) => callback(data);
    ipcRenderer.on('screenshot-taken', subscription);
    return () => ipcRenderer.removeListener('screenshot-taken', subscription);
  },

  // Global events
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('unauthorized', subscription);
    return () => ipcRenderer.removeListener('unauthorized', subscription);
  },

  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('processing-no-screenshots', subscription);
    return () => ipcRenderer.removeListener('processing-no-screenshots', subscription);
  },

  onResetView: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('reset-view', subscription);
    return () => ipcRenderer.removeListener('reset-view', subscription);
  },

  // Solution processing events
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('solution-start', subscription);
    return () => ipcRenderer.removeListener('solution-start', subscription);
  },

  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error);
    ipcRenderer.on('solution-error', subscription);
    return () => ipcRenderer.removeListener('solution-error', subscription);
  },

  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('solution-success', subscription);
    return () => ipcRenderer.removeListener('solution-success', subscription);
  },

  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('problem-extracted', subscription);
    return () => ipcRenderer.removeListener('problem-extracted', subscription);
  },

  // Debug events
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('debug-start', subscription);
    return () => ipcRenderer.removeListener('debug-start', subscription);
  },

  onDebugSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('debug-success', subscription);
    return () => ipcRenderer.removeListener('debug-success', subscription);
  },

  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error);
    ipcRenderer.on('debug-error', subscription);
    return () => ipcRenderer.removeListener('debug-error', subscription);
  },

  // Audio processing
  analyzeAudioFromBase64: (data: string, mimeType: string) =>
    ipcRenderer.invoke('analyze-audio-base64', data, mimeType),
  
  analyzeAudioFile: (path: string) =>
    ipcRenderer.invoke('analyze-audio-file', path),

  // Universal AI functionality
  askQuestion: (question: string, options?: any) =>
    ipcRenderer.invoke('ask-question', question, options),
  
  processImages: (imagePaths: string[], options?: any) =>
    ipcRenderer.invoke('process-images', imagePaths, options),
  
  processAudio: (audioData: any, options?: any) =>
    ipcRenderer.invoke('process-audio', audioData, options),
  
  getAvailableModels: () =>
    ipcRenderer.invoke('get-available-models'),

  // Ollama-specific functionality
  processInterview: (additionalContext?: string) =>
    ipcRenderer.invoke('process-interview', additionalContext),
  
  checkOllamaConnection: () =>
    ipcRenderer.invoke('check-ollama-connection'),

  // Processing status events
  onProcessingStatus: (callback: (status: any) => void) => {
    const subscription = (_: any, status: any) => callback(status);
    ipcRenderer.on('processing-status', subscription);
    return () => ipcRenderer.removeListener('processing-status', subscription);
  },

  // Streaming response events
  onStreamingResponse: (callback: (partialText: string) => void) => {
    const subscription = (_: any, partialText: string) => callback(partialText);
    ipcRenderer.on('streaming-response', subscription);
    return () => ipcRenderer.removeListener('streaming-response', subscription);
  },

  onStreamingComplete: (callback: (finalText: string) => void) => {
    const subscription = (_: any, finalText: string) => callback(finalText);
    ipcRenderer.on('streaming-complete', subscription);
    return () => ipcRenderer.removeListener('streaming-complete', subscription);
  },

  onStreamingError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error);
    ipcRenderer.on('streaming-error', subscription);
    return () => ipcRenderer.removeListener('streaming-error', subscription);
  },

  // Window movement
  moveWindowLeft: () => ipcRenderer.invoke('move-window-left'),
  moveWindowRight: () => ipcRenderer.invoke('move-window-right'),

  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  solutionStart: () => ipcRenderer.invoke('solution-start'),

  // Platform info
  platform: process.platform,

  // Enhanced solution processing
  startSolutionProcessing: () => ipcRenderer.invoke('solution-start'),

  // Remove streaming event listeners
  removeStreamingListeners: () => {
    ipcRenderer.removeAllListeners('streaming-response');
    ipcRenderer.removeAllListeners('streaming-complete');
    ipcRenderer.removeAllListeners('streaming-error');
  },
});