import { useState, useEffect, useRef, useCallback } from 'react';

export interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  progress?: number;
}

export interface UseStreamingResponseOptions {
  onComplete?: (finalText: string) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  timeoutMs?: number; // Time to wait before considering stream complete
  autoStart?: boolean;
}

export const useStreamingResponse = (options: UseStreamingResponseOptions = {}) => {
  const {
    onComplete,
    onError,
    onProgress,
    timeoutMs = 2000, // Default 2 second timeout
    autoStart = true
  } = options;

  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    isComplete: false,
    hasError: false
  });

  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const isActiveRef = useRef(false);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Reset streaming state
  const resetStream = useCallback(() => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    
    setStreamingState({
      isStreaming: false,
      currentText: '',
      isComplete: false,
      hasError: false
    });
    
    isActiveRef.current = false;
  }, []);

  // Start streaming
  const startStream = useCallback(() => {
    resetStream();
    
    setStreamingState(prev => ({
      ...prev,
      isStreaming: true,
      isComplete: false,
      hasError: false,
      currentText: ''
    }));
    
    isActiveRef.current = true;
    lastUpdateRef.current = Date.now();
  }, [resetStream]);

  // Handle streaming chunk
  const handleStreamingChunk = useCallback((partialText: string) => {
    if (!isActiveRef.current) return;
    
    lastUpdateRef.current = Date.now();
    
    setStreamingState(prev => ({
      ...prev,
      currentText: partialText,
      isComplete: false,
      hasError: false
    }));

    // Reset timeout for detecting stream completion
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }

    // Set timeout to detect when streaming has stopped with intelligent checking
    streamingTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current && Date.now() - lastUpdateRef.current >= timeoutMs) {
        // Check if response seems complete
        const trimmedText = partialText.trim();
        const seemsComplete = /[.!?]$|```$|\n\n$/.test(trimmedText) || 
                             trimmedText.length > 100;
        
        if (seemsComplete) {
          completeStream(partialText);
        }
        // If not complete, extend timeout
        else {
          streamingTimeoutRef.current = setTimeout(() => {
            completeStream(partialText);
          }, 3000);
        }
      }
    }, timeoutMs);
  }, [timeoutMs]);

  // Complete streaming
  const completeStream = useCallback((finalText: string) => {
    if (!isActiveRef.current) return;
    
    isActiveRef.current = false;
    
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }

    setStreamingState(prev => ({
      ...prev,
      currentText: finalText,
      isStreaming: false,
      isComplete: true,
      hasError: false
    }));

    onComplete?.(finalText);
  }, [onComplete]);

  // Handle streaming error
  const handleStreamingError = useCallback((error: string) => {
    if (!isActiveRef.current) return;
    
    isActiveRef.current = false;
    
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }

    setStreamingState(prev => ({
      ...prev,
      isStreaming: false,
      isComplete: true,
      hasError: true,
      errorMessage: error
    }));

    onError?.(error);
  }, [onError]);

  // Handle progress updates
  const handleProgress = useCallback((progress: number) => {
    if (!isActiveRef.current) return;
    
    setStreamingState(prev => ({
      ...prev,
      progress
    }));

    onProgress?.(progress);
  }, [onProgress]);

  // Set up event listeners
  useEffect(() => {
    if (!autoStart) return;

    const cleanupStreamingResponse = window.electronAPI.onStreamingResponse(handleStreamingChunk);
    const cleanupStreamingComplete = window.electronAPI.onStreamingComplete(completeStream);
    const cleanupStreamingError = window.electronAPI.onStreamingError(handleStreamingError);
    
    // Also listen for processing status for progress updates
    const cleanupProcessingStatus = window.electronAPI.onProcessingStatus((status: any) => {
      if (status.progress !== undefined) {
        handleProgress(status.progress);
      }
    });

    cleanupFunctionsRef.current = [
      cleanupStreamingResponse,
      cleanupStreamingComplete,
      cleanupStreamingError,
      cleanupProcessingStatus
    ];

    return () => {
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [autoStart, handleStreamingChunk, completeStream, handleStreamingError, handleProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      cleanupFunctionsRef.current.forEach(cleanup => cleanup());
    };
  }, []);

  // Manual control functions
  const manualStart = useCallback(() => {
    if (!autoStart) {
      startStream();
    }
  }, [autoStart, startStream]);

  const manualStop = useCallback(() => {
    if (isActiveRef.current) {
      completeStream(streamingState.currentText);
    }
  }, [completeStream, streamingState.currentText]);

  const manualReset = useCallback(() => {
    resetStream();
  }, [resetStream]);

  return {
    streamingState,
    startStream: manualStart,
    stopStream: manualStop,
    resetStream: manualReset,
    isActive: isActiveRef.current
  };
};