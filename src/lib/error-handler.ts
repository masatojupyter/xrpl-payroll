/**
 * エラーハンドリングユーティリティ
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later') {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * エラーを適切なAppErrorに変換
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500);
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}

/**
 * APIレスポンス用のエラーフォーマット
 */
export function formatErrorResponse(error: unknown) {
  const appError = normalizeError(error);

  return {
    error: {
      code: appError.code,
      message: appError.message,
      ...(process.env.NODE_ENV === 'development' && {
        details: appError.details,
        stack: appError.stack,
      }),
    },
  };
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserFriendlyMessage(error: unknown): string {
  const appError = normalizeError(error);

  const messages: Record<string, string> = {
    VALIDATION_ERROR: 'Input validation failed. Please check your input.',
    AUTHENTICATION_ERROR: 'Authentication required. Please log in',
    AUTHORIZATION_ERROR: 'You do not have permission to perform this action',
    NOT_FOUND: 'The requested resource was not found',
    CONFLICT: 'A resource conflict occurred',
    RATE_LIMIT: 'Too many requests. Please try again later',
    NETWORK_ERROR: 'A network error occurred. Please check your connection',
    TIMEOUT_ERROR: 'The request timed out. Please try again',
  };

  return messages[appError.code] || appError.message || 'An unexpected error occurred';
}

/**
 * エラーをログに記録
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const appError = normalizeError(error);

  console.error('[Error]', {
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    context,
    stack: appError.stack,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Fetch APIのエラーハンドリング
 */
export async function handleFetchError(response: Response): Promise<never> {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const message = errorData.error?.message || errorData.message || 'Request failed';

  switch (response.status) {
    case 400:
      throw new ValidationError(message, errorData.error?.details);
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message);
    case 404:
      throw new NotFoundError(message);
    case 409:
      throw new ConflictError(message);
    case 429:
      throw new RateLimitError(message);
    default:
      throw new AppError(message, errorData.error?.code || 'REQUEST_ERROR', response.status);
  }
}

/**
 * 安全なfetchラッパー
 */
export async function safeFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleFetchError(response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new AppError(
        'A network error occurred',
        'NETWORK_ERROR',
        0
      );
    }

    throw normalizeError(error);
  }
}

/**
 * リトライ機能付きのfetch
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await safeFetch<T>(url, options);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
      }
    }
  }

  throw lastError || new AppError('Request failed', 'RETRY_FAILED');
}
