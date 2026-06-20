type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  route?: string;
  survey_id?: string;
  respondent_id?: string;
  error?: string;
  error_class?: string;
  duration_ms?: number;
  [key: string]: unknown;
}
const SENSITIVE_KEYS = new Set(['password', 'token', 'secret', 'key', 'auth', 'authorization', 'cookie']);

function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(entry: LogEntry): void {
  const timestamp = new Date().toISOString();
  const sanitizedEntry = sanitize(entry);
  const base = { timestamp, ...sanitizedEntry };
  const method = entry.level === 'error' ? console.error
    : entry.level === 'warn' ? console.warn
    : entry.level === 'debug' ? console.debug
    : console.log;
  method(JSON.stringify(base));
}

export const logger = {
  info: (message: string, meta?: Partial<LogEntry>) => log({ level: 'info', message, ...meta }),
  warn: (message: string, meta?: Partial<LogEntry>) => log({ level: 'warn', message, ...meta }),
  error: (message: string, meta?: Partial<LogEntry>) => {
    if (meta?.error && !meta.error_class) {
      meta.error_class = meta.error?.constructor?.name || 'Unknown';
    }
    log({ level: 'error', message, ...meta });
  },
  debug: (message: string, meta?: Partial<LogEntry>) => {
    if (process.env.NODE_ENV !== 'production') {
      log({ level: 'debug', message, ...meta });
    }
  },
};
