// Shared screenshot management hook
import { useQuery } from 'react-query';
import { useErrorHandler } from './useErrorHandler';
import { logger } from '../utils/logger';
import { ERROR_MESSAGES } from '../utils/errorMessages';

export const useScreenshotManager = (queryKey: string = 'screenshots') => {
  const { handleAsyncOperation } = useErrorHandler();

  // Load screenshots query
  const { data: screenshots = [], refetch, isLoading } = useQuery<Array<{ path: string; preview: string }>, Error>(
    [queryKey],
    async () => {
      const result = await handleAsyncOperation(
        () => window.electronAPI.getScreenshots(),
        `Loading screenshots for ${queryKey}`
      );
      return result.success ? result.data || [] : [];
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  );

  // Delete screenshot function
  const deleteScreenshot = async (index: number, onSuccess?: () => void, onError?: (error: string) => void) => {
    const screenshotToDelete = screenshots[index];
    if (!screenshotToDelete) {
      logger.warn('Screenshot not found at index', index);
      return;
    }

    const result = await handleAsyncOperation(
      () => window.electronAPI.deleteScreenshot(screenshotToDelete.path),
      `Deleting screenshot ${screenshotToDelete.path}`
    );

    if (result.success && result.data?.success) {
      refetch();
      logger.log('Screenshot deleted successfully');
      onSuccess?.();
    } else {
      const errorMessage = result.error || ERROR_MESSAGES.SCREENSHOT_DELETE_FAILED;
      logger.error('Screenshot deletion failed', errorMessage);
      onError?.(errorMessage);
    }
  };

  return {
    screenshots,
    isLoading,
    refetch,
    deleteScreenshot
  };
};