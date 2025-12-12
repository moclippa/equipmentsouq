/**
 * Base Service Infrastructure
 *
 * This module provides foundational patterns for the services layer:
 * - ServiceResult: Type-safe result pattern for service operations
 * - ServiceError: Standardized error types with codes
 * - Base service class with common utilities
 *
 * @see docs/ARCHITECTURE.md for service layer documentation
 */

// =============================================================================
// ERROR CODES
// Centralized error code definitions for consistent client handling
// =============================================================================

export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic
  INVALID_LISTING_TYPE: 'INVALID_LISTING_TYPE',
  PRICE_REQUIRED: 'PRICE_REQUIRED',
  EQUIPMENT_NOT_AVAILABLE: 'EQUIPMENT_NOT_AVAILABLE',
  LEAD_ALREADY_EXISTS: 'LEAD_ALREADY_EXISTS',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',

  // Trust & Reviews
  REVIEW_NOT_ELIGIBLE: 'REVIEW_NOT_ELIGIBLE',
  REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
  REVIEW_REQUEST_NOT_READY: 'REVIEW_REQUEST_NOT_READY',
  INVALID_RATING: 'INVALID_RATING',
  CANNOT_REVIEW_OWN_LISTING: 'CANNOT_REVIEW_OWN_LISTING',
  REVIEW_REQUEST_EXPIRED: 'REVIEW_REQUEST_EXPIRED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // External services
  SMS_FAILED: 'SMS_FAILED',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// =============================================================================
// SERVICE ERROR
// Structured error type with code, message, and optional metadata
// =============================================================================

export interface ServiceError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// SERVICE RESULT
// Type-safe result pattern - prefer this over throwing exceptions
// =============================================================================

export class ServiceResult<T> {
  private constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: ServiceError
  ) {}

  /**
   * Create a successful result
   */
  static ok<T>(data: T): ServiceResult<T> {
    return new ServiceResult(true, data, undefined);
  }

  /**
   * Create a failed result
   */
  static fail<T = never>(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): ServiceResult<T> {
    return new ServiceResult<T>(false, undefined as T | undefined, { code, message, details });
  }

  /**
   * Create a failed result from an existing ServiceError
   */
  static fromError<T>(error: ServiceError): ServiceResult<T> {
    return new ServiceResult<T>(false, undefined, error);
  }

  /**
   * Map the data if successful, preserve error if failed
   */
  map<U>(fn: (data: T) => U): ServiceResult<U> {
    if (this.success && this.data !== undefined) {
      return ServiceResult.ok(fn(this.data));
    }
    return ServiceResult.fail<U>(this.error!.code, this.error!.message, this.error!.details);
  }

  /**
   * Get data or throw (use sparingly, prefer pattern matching)
   */
  unwrap(): T {
    if (!this.success || this.data === undefined) {
      throw new Error(this.error?.message || 'Result has no data');
    }
    return this.data;
  }

  /**
   * Get data or return default value
   */
  unwrapOr(defaultValue: T): T {
    return this.success && this.data !== undefined ? this.data : defaultValue;
  }

  /**
   * Check if result is an error with specific code
   */
  hasErrorCode(code: ErrorCode): boolean {
    return !this.success && this.error?.code === code;
  }
}

// =============================================================================
// HTTP STATUS MAPPING
// Map error codes to appropriate HTTP status codes
// =============================================================================

export function errorCodeToHttpStatus(code: ErrorCode): number {
  switch (code) {
    // 401 Unauthorized
    case ErrorCodes.UNAUTHORIZED:
    case ErrorCodes.SESSION_EXPIRED:
      return 401;

    // 403 Forbidden
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.PHONE_NOT_VERIFIED:
      return 403;

    // 404 Not Found
    case ErrorCodes.NOT_FOUND:
      return 404;

    // 409 Conflict
    case ErrorCodes.CONFLICT:
    case ErrorCodes.ALREADY_EXISTS:
    case ErrorCodes.BOOKING_CONFLICT:
    case ErrorCodes.LEAD_ALREADY_EXISTS:
      return 409;

    // 422 Unprocessable Entity
    case ErrorCodes.VALIDATION_ERROR:
    case ErrorCodes.INVALID_INPUT:
    case ErrorCodes.MISSING_REQUIRED_FIELD:
    case ErrorCodes.INVALID_LISTING_TYPE:
    case ErrorCodes.PRICE_REQUIRED:
    case ErrorCodes.EQUIPMENT_NOT_AVAILABLE:
    case ErrorCodes.REVIEW_NOT_ELIGIBLE:
    case ErrorCodes.REVIEW_ALREADY_EXISTS:
    case ErrorCodes.REVIEW_REQUEST_NOT_READY:
    case ErrorCodes.INVALID_RATING:
    case ErrorCodes.CANNOT_REVIEW_OWN_LISTING:
    case ErrorCodes.REVIEW_REQUEST_EXPIRED:
      return 422;

    // 429 Too Many Requests
    case ErrorCodes.RATE_LIMITED:
    case ErrorCodes.TOO_MANY_REQUESTS:
      return 429;

    // 502 Bad Gateway (external service failures)
    case ErrorCodes.SMS_FAILED:
    case ErrorCodes.AI_SERVICE_ERROR:
    case ErrorCodes.STORAGE_ERROR:
    case ErrorCodes.EXTERNAL_SERVICE_ERROR:
      return 502;

    // 500 Internal Server Error
    case ErrorCodes.INTERNAL_ERROR:
    case ErrorCodes.DATABASE_ERROR:
    default:
      return 500;
  }
}

// =============================================================================
// COMMON VALIDATION HELPERS
// =============================================================================

/**
 * Validate Saudi Arabia phone number format
 * Accepts: +966XXXXXXXXX or 05XXXXXXXX
 */
export function isValidSaudiPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+966|05)[0-9]{8,9}$/.test(cleaned);
}

/**
 * Validate Bahrain phone number format
 * Accepts: +973XXXXXXXX
 */
export function isValidBahrainPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return /^(\+973)[0-9]{8}$/.test(cleaned);
}

/**
 * Validate phone number for supported countries
 */
export function isValidPhone(phone: string, country: 'SA' | 'BH'): boolean {
  return country === 'SA' ? isValidSaudiPhone(phone) : isValidBahrainPhone(phone);
}
