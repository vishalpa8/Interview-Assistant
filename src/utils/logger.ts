// Smart logging system for production ghost mode
class Logger {
  private isDev: boolean;
  private errorLog: Array<{ timestamp: Date; level: string; message: string; data?: any }> = [];
  private maxLogSize = 100; // Keep last 100 errors

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || !window.electronAPI;
  }

  private addToLog(level: string, message: string, data?: any) {
    this.errorLog.push({
      timestamp: new Date(),
      level,
      message,
      data
    });

    // Keep only last maxLogSize entries
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  log(message: string, data?: any) {
    this.addToLog('LOG', message, data);
    if (this.isDev) {
      console.log(`[LOG] ${message}`, data || '');
    }
  }

  warn(message: string, data?: any) {
    this.addToLog('WARN', message, data);
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, data || '');
    }
  }

  error(message: string, error?: any) {
    this.addToLog('ERROR', message, error);
    if (this.isDev) {
      console.error(`[ERROR] ${message}`, error || '');
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 20) {
    return this.errorLog.slice(-count);
  }

  // Get all error logs
  getErrorLogs() {
    return this.errorLog.filter(log => log.level === 'ERROR');
  }

  // Clear logs
  clearLogs() {
    this.errorLog = [];
  }

  // Enable debug mode temporarily
  enableDebugMode() {
    this.isDev = true;
  }

  // Disable debug mode
  disableDebugMode() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  // Export logs for debugging
  exportLogs() {
    return {
      logs: this.errorLog,
      timestamp: new Date(),
      environment: process.env.NODE_ENV,
      userAgent: navigator.userAgent
    };
  }

  // Get error summary
  getErrorSummary() {
    const errors = this.getErrorLogs();
    const summary = {
      totalErrors: errors.length,
      recentErrors: errors.slice(-5),
      errorTypes: {} as Record<string, number>
    };

    errors.forEach(error => {
      const type = error.data?.code || error.data?.name || 'Unknown';
      summary.errorTypes[type] = (summary.errorTypes[type] || 0) + 1;
    });

    return summary;
  }
}

export const logger = new Logger();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason
  });
});

// Global debug access (only in development or when explicitly enabled)
(window as any).__DEBUG__ = {
  logger,
  enableDebug: () => logger.enableDebugMode(),
  disableDebug: () => logger.disableDebugMode(),
  getLogs: () => logger.getRecentLogs(),
  getErrors: () => logger.getErrorLogs(),
  getSummary: () => logger.getErrorSummary(),
  exportLogs: () => logger.exportLogs(),
  clearLogs: () => logger.clearLogs()
};