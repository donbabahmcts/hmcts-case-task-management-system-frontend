import config from 'config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  prettyPrint: boolean;
}

class Logger {
  private config: LogConfig;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.config = config.has('logging') ? config.get<LogConfig>('logging') : { level: 'info', prettyPrint: false };
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    if (this.config.prettyPrint) {
      const metaStr = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }
    const logObject: Record<string, unknown> = { timestamp, level, message };
    if (meta) {
      logObject.meta = meta;
    }
    return JSON.stringify(logObject);
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: unknown): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

export const logger = new Logger();
