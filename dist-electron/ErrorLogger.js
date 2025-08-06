"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = exports.logError = exports.ErrorLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
class ErrorLogger {
    static instance = null;
    logFilePath;
    constructor() {
        // Create logs directory in user data
        const userDataPath = electron_1.app.getPath('userData');
        const logsDir = path_1.default.join(userDataPath, 'logs');
        // Ensure logs directory exists
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
        this.logFilePath = path_1.default.join(logsDir, 'error.log');
    }
    static getInstance() {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }
    logError(context, error, additionalInfo) {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        const logEntry = {
            timestamp,
            context,
            message: errorMessage,
            stack: errorStack,
            additionalInfo: additionalInfo || null
        };
        // Log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.error(`[${context}]`, error);
        }
        // Write to log file
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs_1.default.appendFileSync(this.logFilePath, logLine);
        }
        catch (writeError) {
            // If we can't write to log file, at least log to console
            console.error('Failed to write to error log:', writeError);
            console.error('Original error:', logEntry);
        }
    }
    logInfo(context, message, additionalInfo) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            context,
            level: 'INFO',
            message,
            additionalInfo: additionalInfo || null
        };
        // Log to console for development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[${context}] ${message}`);
        }
        // Write to log file
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs_1.default.appendFileSync(this.logFilePath, logLine);
        }
        catch (writeError) {
            console.error('Failed to write to info log:', writeError);
        }
    }
    getLogFilePath() {
        return this.logFilePath;
    }
    clearLogs() {
        try {
            if (fs_1.default.existsSync(this.logFilePath)) {
                fs_1.default.unlinkSync(this.logFilePath);
            }
        }
        catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }
}
exports.ErrorLogger = ErrorLogger;
// Convenience functions for easy use throughout the app
const logError = (context, error, additionalInfo) => {
    ErrorLogger.getInstance().logError(context, error, additionalInfo);
};
exports.logError = logError;
const logInfo = (context, message, additionalInfo) => {
    ErrorLogger.getInstance().logInfo(context, message, additionalInfo);
};
exports.logInfo = logInfo;
//# sourceMappingURL=ErrorLogger.js.map