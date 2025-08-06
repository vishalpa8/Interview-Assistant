import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class ErrorLogger {
  private static instance: ErrorLogger | null = null
  private logFilePath: string

  constructor() {
    // Create logs directory in user data
    const userDataPath = app.getPath('userData')
    const logsDir = path.join(userDataPath, 'logs')
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
    
    this.logFilePath = path.join(logsDir, 'error.log')
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  public logError(context: string, error: any, additionalInfo?: any): void {
    const timestamp = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : 'No stack trace'
    
    const logEntry = {
      timestamp,
      context,
      message: errorMessage,
      stack: errorStack,
      additionalInfo: additionalInfo || null
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}]`, error)
    }

    // Write to log file
    try {
      const logLine = JSON.stringify(logEntry) + '\n'
      fs.appendFileSync(this.logFilePath, logLine)
    } catch (writeError) {
      // If we can't write to log file, at least log to console
      console.error('Failed to write to error log:', writeError)
      console.error('Original error:', logEntry)
    }
  }

  public logInfo(context: string, message: string, additionalInfo?: any): void {
    const timestamp = new Date().toISOString()
    
    const logEntry = {
      timestamp,
      context,
      level: 'INFO',
      message,
      additionalInfo: additionalInfo || null
    }

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${context}] ${message}`)
    }

    // Write to log file
    try {
      const logLine = JSON.stringify(logEntry) + '\n'
      fs.appendFileSync(this.logFilePath, logLine)
    } catch (writeError) {
      console.error('Failed to write to info log:', writeError)
    }
  }

  public getLogFilePath(): string {
    return this.logFilePath
  }

  public clearLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        fs.unlinkSync(this.logFilePath)
      }
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }
}

// Convenience functions for easy use throughout the app
export const logError = (context: string, error: any, additionalInfo?: any) => {
  ErrorLogger.getInstance().logError(context, error, additionalInfo)
}

export const logInfo = (context: string, message: string, additionalInfo?: any) => {
  ErrorLogger.getInstance().logInfo(context, message, additionalInfo)
}