"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose the complete electronAPI that the React app expects
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Window management
    updateContentDimensions: (dimensions) => electron_1.ipcRenderer.invoke('update-content-dimensions', dimensions),
    // Screenshot functionality
    getScreenshots: () => electron_1.ipcRenderer.invoke('get-screenshots'),
    takeScreenshot: () => electron_1.ipcRenderer.invoke('take-screenshot'),
    deleteScreenshot: (path) => electron_1.ipcRenderer.invoke('delete-screenshot', path),
    // Event listeners for screenshots
    onScreenshotTaken: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on('screenshot-taken', subscription);
        return () => electron_1.ipcRenderer.removeListener('screenshot-taken', subscription);
    },
    // Global events
    onUnauthorized: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on('unauthorized', subscription);
        return () => electron_1.ipcRenderer.removeListener('unauthorized', subscription);
    },
    onProcessingNoScreenshots: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on('processing-no-screenshots', subscription);
        return () => electron_1.ipcRenderer.removeListener('processing-no-screenshots', subscription);
    },
    onResetView: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on('reset-view', subscription);
        return () => electron_1.ipcRenderer.removeListener('reset-view', subscription);
    },
    // Solution processing events
    onSolutionStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on('solution-start', subscription);
        return () => electron_1.ipcRenderer.removeListener('solution-start', subscription);
    },
    onSolutionError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on('solution-error', subscription);
        return () => electron_1.ipcRenderer.removeListener('solution-error', subscription);
    },
    onSolutionSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on('solution-success', subscription);
        return () => electron_1.ipcRenderer.removeListener('solution-success', subscription);
    },
    onProblemExtracted: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on('problem-extracted', subscription);
        return () => electron_1.ipcRenderer.removeListener('problem-extracted', subscription);
    },
    // Debug events
    onDebugStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on('debug-start', subscription);
        return () => electron_1.ipcRenderer.removeListener('debug-start', subscription);
    },
    onDebugSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on('debug-success', subscription);
        return () => electron_1.ipcRenderer.removeListener('debug-success', subscription);
    },
    onDebugError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on('debug-error', subscription);
        return () => electron_1.ipcRenderer.removeListener('debug-error', subscription);
    },
    // Audio processing
    analyzeAudioFromBase64: (data, mimeType) => electron_1.ipcRenderer.invoke('analyze-audio-base64', data, mimeType),
    analyzeAudioFile: (path) => electron_1.ipcRenderer.invoke('analyze-audio-file', path),
    // Ask functionality
    askQuestion: (question) => electron_1.ipcRenderer.invoke('ask-question', question),
    // Window movement
    moveWindowLeft: () => electron_1.ipcRenderer.invoke('move-window-left'),
    moveWindowRight: () => electron_1.ipcRenderer.invoke('move-window-right'),
    // App control
    quitApp: () => electron_1.ipcRenderer.invoke('quit-app'),
    hideWindow: () => electron_1.ipcRenderer.invoke('hide-window'),
    solutionStart: () => electron_1.ipcRenderer.invoke('solution-start'),
    // Platform info
    platform: process.platform,
});
