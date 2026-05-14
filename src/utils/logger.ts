type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  debug(...args: any[]) {
    if (isDev) console.log(`[${this.prefix}]`, ...args);
  }

  info(...args: any[]) {
    if (isDev) console.info(`[${this.prefix}]`, ...args);
  }

  warn(...args: any[]) {
    console.warn(`[${this.prefix}]`, ...args);
  }

  error(...args: any[]) {
    console.error(`[${this.prefix}]`, ...args);
  }
}

export const createLogger = (prefix: string) => new Logger(prefix);
