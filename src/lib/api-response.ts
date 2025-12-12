/**
 * Centralized API Response Utilities
 *
 * Provides consistent response formatting across all API routes.
 * Use these helpers instead of raw NextResponse.json() for:
 * - Consistent error shape for clients
 * - Automatic HTTP status code mapping
 * - Easy integration with ServiceResult
 *
 * @example
 * // Success response
 * return successResponse({ user: userData });
 *
 * // Error response
 * return errorResponse(ErrorCodes.NOT_FOUND, 'Equipment not found');
 *
 * // From ServiceResult
 * const result = await equipmentService.getById(id);
 * return serviceResultToResponse(result);
 */

import { NextResponse } from 'next/server';
import {
  ServiceResult,
  ServiceError,
  ErrorCode,
  ErrorCodes,
  errorCodeToHttpStatus,
} from '@/services/base';

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface APISuccessResponse<T> {
  success: true;
  data: T;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

// =============================================================================
// SUCCESS RESPONSES
// =============================================================================

/**
 * Create a successful JSON response
 *
 * @param data - Response payload
 * @param status - HTTP status code (default: 200)
 */
export function successResponse<T>(data: T, status = 200): NextResponse<APISuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create a 201 Created response
 */
export function createdResponse<T>(data: T): NextResponse<APISuccessResponse<T>> {
  return successResponse(data, 201);
}

/**
 * Create a 204 No Content response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// =============================================================================
// ERROR RESPONSES
// =============================================================================

/**
 * Create an error JSON response
 *
 * @param code - Error code from ErrorCodes
 * @param message - Human-readable error message
 * @param details - Optional additional details
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  const status = errorCodeToHttpStatus(code);
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details && { details }) },
    },
    { status }
  );
}

/**
 * Create an error response from a ServiceError
 */
export function errorResponseFromServiceError(error: ServiceError): NextResponse<APIErrorResponse> {
  return errorResponse(error.code, error.message, error.details);
}

// =============================================================================
// COMMON ERROR SHORTCUTS
// =============================================================================

/**
 * 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse<APIErrorResponse> {
  return errorResponse(ErrorCodes.UNAUTHORIZED, message);
}

/**
 * 403 Forbidden response
 */
export function forbiddenResponse(message = 'Access denied'): NextResponse<APIErrorResponse> {
  return errorResponse(ErrorCodes.FORBIDDEN, message);
}

/**
 * 403 Phone not verified response
 */
export function phoneNotVerifiedResponse(): NextResponse<APIErrorResponse> {
  return errorResponse(
    ErrorCodes.PHONE_NOT_VERIFIED,
    'Please verify your phone number before continuing'
  );
}

/**
 * 404 Not Found response
 */
export function notFoundResponse(resource = 'Resource'): NextResponse<APIErrorResponse> {
  return errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`);
}

/**
 * 422 Validation Error response
 */
export function validationErrorResponse(
  message: string,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  return errorResponse(ErrorCodes.VALIDATION_ERROR, message, details);
}

/**
 * 429 Rate Limited response
 */
export function rateLimitedResponse(retryAfter?: number): NextResponse<APIErrorResponse> {
  const response = errorResponse(
    ErrorCodes.RATE_LIMITED,
    'Too many requests, please try again later'
  );
  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }
  return response;
}

/**
 * 500 Internal Server Error response
 */
export function internalErrorResponse(message = 'An unexpected error occurred'): NextResponse<APIErrorResponse> {
  return errorResponse(ErrorCodes.INTERNAL_ERROR, message);
}

// =============================================================================
// SERVICE RESULT INTEGRATION
// =============================================================================

/**
 * Convert a ServiceResult to an appropriate NextResponse
 *
 * @param result - ServiceResult from a service method
 * @param successStatus - HTTP status for success (default: 200)
 *
 * @example
 * const result = await equipmentService.create(data);
 * return serviceResultToResponse(result, 201);
 */
export function serviceResultToResponse<T>(
  result: ServiceResult<T>,
  successStatus = 200
): NextResponse {
  if (result.success && result.data !== undefined) {
    return successResponse(result.data, successStatus);
  }
  if (result.error) {
    return errorResponseFromServiceError(result.error);
  }
  return internalErrorResponse('Unknown service error');
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate request body with Zod schema and return error response if invalid
 *
 * @param schema - Zod schema to validate against
 * @param body - Request body to validate
 * @returns Validated data or error response
 *
 * @example
 * const validation = validateBody(createEquipmentSchema, body);
 * if (validation instanceof NextResponse) return validation;
 * const data = validation;
 */
export function validateBody<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: unknown[] } } },
  body: unknown
): T | NextResponse<APIErrorResponse> {
  const result = schema.safeParse(body);
  if (!result.success) {
    return validationErrorResponse('Invalid request data', {
      issues: result.error?.issues || [],
    });
  }
  return result.data as T;
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

interface Session {
  user?: {
    id?: string;
    role?: string;
    phoneVerified?: boolean;
  } | null;
}

/**
 * Check if session is authenticated, return error response if not
 *
 * @example
 * const session = await auth();
 * const authError = requireAuth(session);
 * if (authError) return authError;
 */
export function requireAuth(session: Session | null): NextResponse<APIErrorResponse> | null {
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  return null;
}

/**
 * Check if user has verified phone, return error response if not
 *
 * @example
 * const phoneError = requireVerifiedPhone(session);
 * if (phoneError) return phoneError;
 */
export function requireVerifiedPhone(session: Session | null): NextResponse<APIErrorResponse> | null {
  const authError = requireAuth(session);
  if (authError) return authError;

  if (!session?.user?.phoneVerified) {
    return phoneNotVerifiedResponse();
  }
  return null;
}

/**
 * Check if user has admin role, return error response if not
 */
export function requireAdmin(session: Session | null): NextResponse<APIErrorResponse> | null {
  const authError = requireAuth(session);
  if (authError) return authError;

  if (session?.user?.role !== 'ADMIN') {
    return forbiddenResponse('Admin access required');
  }
  return null;
}
