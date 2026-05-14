import { NextResponse } from 'next/server';
import { logger } from './log';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: Record<string, unknown>;
}

export class Api {
  static success<T>(data: T, status = 200, meta?: Record<string, unknown>) {
    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          ...meta,
        },
      },
      { status }
    );
  }

  static error(message: string, status = 400, code?: string, meta?: Record<string, unknown>) {
    if (status >= 500) {
      logger.error(message, { status, code, ...meta });
    } else {
      logger.warn(message, { status, code, ...meta });
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: code || 'ERROR',
        meta: {
          timestamp: new Date().toISOString(),
          ...meta,
        },
      },
      { status }
    );
  }

  static unauthorized(message = 'Unauthorized') {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return this.error(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Not Found') {
    return this.error(message, 404, 'NOT_FOUND');
  }

  static tooManyRequests(message = 'Too Many Requests', retryAfter?: number) {
    const headers: Record<string, string> = {};
    if (retryAfter) headers['Retry-After'] = String(retryAfter);
    
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'TOO_MANY_REQUESTS',
      },
      { status: 429, headers }
    );
  }

  static serverError(message = 'Internal Server Error', error?: unknown) {
    return this.error(message, 500, 'SERVER_ERROR', { 
      original_error: error instanceof Error ? error.message : String(error) 
    });
  }
}
