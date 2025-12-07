import * as appInsights from 'applicationinsights';

/**
 * Logger utility for the HMCTS Case Management System
 * Provides structured logging with Application Insights integration
 */

interface LogMetadata {
  [key: string]: unknown;
}

class Logger {
  private appInsightsClient: appInsights.TelemetryClient | null = null;

  constructor() {
    // Initialize Application Insights if connection string is available
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      appInsights
        .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true, true)
        .setUseDiskRetryCaching(true)
        .start();

      this.appInsightsClient = appInsights.defaultClient;
    }
  }

  /**
   * Log informational message
   */
  info(message: string, metadata?: LogMetadata): void {
    const logMessage = this.formatMessage('INFO', message, metadata);
    console.log(logMessage);
    
    if (this.appInsightsClient) {
      this.appInsightsClient.trackTrace({
        message,
        severity: appInsights.Contracts.SeverityLevel.Information,
        properties: metadata as { [key: string]: string },
      });
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    const logMessage = this.formatMessage('WARN', message, metadata);
    console.warn(logMessage);
    
    if (this.appInsightsClient) {
      this.appInsightsClient.trackTrace({
        message,
        severity: appInsights.Contracts.SeverityLevel.Warning,
        properties: metadata as { [key: string]: string },
      });
    }
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: LogMetadata): void {
    const logMessage = this.formatMessage('ERROR', message, metadata);
    console.error(logMessage);
    
    if (this.appInsightsClient) {
      this.appInsightsClient.trackTrace({
        message,
        severity: appInsights.Contracts.SeverityLevel.Error,
        properties: metadata as { [key: string]: string },
      });

      // If metadata contains an error object, track it separately
      if (metadata?.error instanceof Error) {
        this.appInsightsClient.trackException({ exception: metadata.error });
      }
    }
  }

  /**
   * Format log message with timestamp and metadata
   */
  private formatMessage(level: string, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const metadataString = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level}] ${message}${metadataString}`;
  }
}

// Export singleton instance
export const logger = new Logger();
