// Shared OS detection utility
import { useState, useEffect } from 'react';

export const useOSDetection = () => {
  const [currentOS, setCurrentOS] = useState<string>('windows');

  useEffect(() => {
    // Detect current OS
    if (window.electronAPI?.platform) {
      setCurrentOS(window.electronAPI.platform);
    } else {
      // Fallback detection
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Win')) {
        setCurrentOS('win32');
      } else if (userAgent.includes('Mac')) {
        setCurrentOS('darwin');
      } else {
        setCurrentOS('linux');
      }
    }
  }, []);

  // Get OS-specific key display
  const getOSKey = (key: string) => {
    // Only show ⌘ symbol for macOS (darwin)
    if (currentOS === 'darwin' && key === 'Ctrl') {
      return '⌘';
    }
    // For Windows (win32) and Linux, always show 'Ctrl'
    return key;
  };

  // Get OS-specific modifier text
  const getModifierText = () => {
    // Only use 'Cmd' for macOS (darwin)
    if (currentOS === 'darwin') {
      return 'Cmd';
    }
    // For Windows (win32) and Linux, always use 'Ctrl'
    return 'Ctrl';
  };

  return {
    currentOS,
    getOSKey,
    getModifierText
  };
};