// Simple logger implementation for client and server
// In production, consider using a more robust logging library like Winston or Pino

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isClient) {
      // In client, only log errors and warnings by default
      return level === 'error' || level === 'warn' || this.isDevelopment;
    }

    // In server, log all levels in development, info+ in production
    if (this.isDevelopment) {
      return true;
    }

    return level === 'info' || level === 'warn' || level === 'error';
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
    };
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    if (entry.data && this.isDevelopment) {
      return `${message}\n${JSON.stringify(entry.data, null, 2)}`;
    }

    return message;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }

    // In production, you would send logs to external service
    if (!this.isDevelopment && !this.isClient) {
      this.sendToExternalService(entry);
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // Placeholder for external logging service integration
    // Examples: DataDog, Sentry, CloudWatch, etc.

    if (entry.level === 'error') {
      // Send errors to error tracking service
      // await sendToSentry(entry);
    }

    // Send all logs to logging service
    // await sendToDataDog(entry);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('debug', message, data);
    this.writeLog(entry);
  }

  info(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, data);
    this.writeLog(entry);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', message, data);
    this.writeLog(entry);
  }

  error(message: string, error?: unknown): void {
    let errorData: Record<string, unknown> | undefined;

    // Extract useful information from Error objects
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      };
    } else if (error !== undefined) {
      errorData = { raw: error };
    }

    const entry = this.createLogEntry('error', message, errorData);
    this.writeLog(entry);
  }

  // Context-aware logging methods
  withContext(context: Partial<LogEntry>): Logger {
    const contextualLogger = Object.create(this);

    contextualLogger.createLogEntry = (
      level: LogLevel,
      message: string,
      data?: Record<string, unknown>
    ): LogEntry => {
      return {
        ...this.createLogEntry(level, message, data),
        ...context,
      };
    };

    return contextualLogger;
  }

  // Security-focused logging
  security(message: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', `[SECURITY] ${message}`, {
      ...data,
      timestamp: this.formatTimestamp(),
      security: true,
    });
    this.writeLog(entry);

    // Always send security events to external service in production
    if (!this.isDevelopment && !this.isClient) {
      this.sendToExternalService(entry);
    }
  }

  // Performance logging
  performance(operation: string, duration: number, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry(
      'info',
      `[PERFORMANCE] ${operation} took ${duration}ms`,
      {
        ...data,
        operation,
        duration,
        performance: true,
      }
    );
    this.writeLog(entry);
  }

  // Audit logging for important actions
  audit(action: string, userId?: string, data?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', `[AUDIT] ${action}`, {
      ...data,
      action,
      userId,
      audit: true,
    });
    this.writeLog(entry);

    // Always send audit events to external service
    if (!this.isDevelopment && !this.isClient) {
      this.sendToExternalService(entry);
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Removed unused logger utilities (Feb 2026 cleanup):
// - measurePerformance(): 39 lines, zero usage confirmed
// - createRequestLogger(): 7 lines, zero usage confirmed
// - logUnhandledError(): 13 lines, zero usage confirmed
// - LOG_LEVELS constant: 4 lines, zero usage confirmed
// If needed in the future, retrieve from git history

export type { LogLevel, LogEntry };
