/// <reference path="./electron.d.ts" />

// This file ensures that the electron types are loaded
import type { ElectronAPI } from './electron';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};