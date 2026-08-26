import { Request, Response, NextFunction } from 'express';
import { isProduction } from '../config/env';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found.`);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, 'BAD_REQUEST', message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Supabase / Postgres errors
  if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err
  ) {
    const dbErr = err as { code: string; message?: string; details?: string };

    // Unique constraint
    if (dbErr.code === '23505') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_ENTRY', message: 'This record already exists.' },
      });
      return;
    }

    // Foreign key violation
    if (dbErr.code === '23503') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: 'Referenced record does not exist.' },
      });
      return;
    }
  }

  // Unknown errors — never expose internals in production
  console.error('[ErrorHandler]', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      ...(isProduction ? {} : { detail: String(err) }),
    },
  });
}
