import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorCode?: string;
  timestamp?: Date;
}

export const useErrorHandler = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorMessage: ''
  });

  const handleError = useCallback((error: any, context?: string) => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    const errorCode = error?.code || error?.name;
    
    logger.error(`Error in ${context || 'unknown context'}`, {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack,
      error
    });

    setErrorState({
      hasError: true,
      errorMessage,
      errorCode,
      timestamp: new Date()
    });

    return {
      success: false,
      error: errorMessage,
      code: errorCode
    };
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      errorMessage: ''
    });
  }, []);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
      const data = await operation();
      logger.log(`Success: ${context}`);
      return { success: true, data };
    } catch (error) {
      const result = handleError(error, context);
      return result;
    }
  }, [handleError]);

  return {
    errorState,
    handleError,
    clearError,
    handleAsyncOperation
  };
};