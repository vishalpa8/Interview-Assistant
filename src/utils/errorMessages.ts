// Standardized error messages
export const ERROR_MESSAGES = {
  // Audio errors
  AUDIO_ANALYSIS_FAILED: 'Audio analysis failed',
  AUDIO_RECORDING_FAILED: 'Could not start audio recording',
  AUDIO_PERMISSION_DENIED: 'Microphone permission denied',
  
  // Screenshot errors
  SCREENSHOT_DELETE_FAILED: 'Failed to delete screenshot',
  SCREENSHOT_LOAD_FAILED: 'Failed to load screenshots',
  SCREENSHOT_CAPTURE_FAILED: 'Failed to capture screenshot',
  
  // Solution errors
  SOLUTION_PROCESSING_FAILED: 'Solution processing failed',
  SOLUTION_INVALID_DATA: 'Received invalid solution data',
  
  // General errors
  NETWORK_ERROR: 'Network connection failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
  PERMISSION_DENIED: 'Permission denied',
} as const;

export const TOAST_TITLES = {
  ERROR: 'Error',
  DELETE_FAILED: 'Delete Failed',
  RECORDING_FAILED: 'Recording Failed',
  PROCESSING_FAILED: 'Processing Failed',
  INVALID_DATA: 'Invalid Data',
  NETWORK_ERROR: 'Network Error',
} as const;