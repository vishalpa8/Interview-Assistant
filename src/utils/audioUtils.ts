// Audio utility functions
import { AudioResult } from '../types/audio';
import { ERROR_MESSAGES } from './errorMessages';

export const createAudioError = (message: string = ERROR_MESSAGES.AUDIO_ANALYSIS_FAILED): AudioResult => {
  return {
    text: message,
    timestamp: Date.now()
  };
};

export const createAudioResult = (text: string): AudioResult => {
  return {
    text,
    timestamp: Date.now()
  };
};

export const isAudioError = (result: AudioResult): boolean => {
  return result.text.toLowerCase().includes('failed') || 
         result.text.toLowerCase().includes('error') ||
         result.text.toLowerCase().includes('could not');
};