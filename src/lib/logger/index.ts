const IS_DEV = process.env.NODE_ENV === 'development';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

function createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
}

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    return `${base} ${JSON.stringify(entry.context)}`;
  }
  return base;
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const entry = createEntry('info', message, context);
    if (IS_DEV) console.log(formatEntry(entry));
  },

  warn(message: string, context?: Record<string, unknown>) {
    const entry = createEntry('warn', message, context);
    console.warn(formatEntry(entry));
  },

  error(message: string, context?: Record<string, unknown>) {
    const entry = createEntry('error', message, context);
    console.error(formatEntry(entry));
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (!IS_DEV) return;
    const entry = createEntry('debug', message, context);
    console.debug(formatEntry(entry));
  },
};
