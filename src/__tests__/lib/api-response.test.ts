/**
 * API Response Utilities Tests
 *
 * Tests for the centralized API response helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  successResponse,
  createdResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
  rateLimitedResponse,
  internalErrorResponse,
  serviceResultToResponse,
  requireAuth,
  requireVerifiedPhone,
  requireAdmin,
} from '@/lib/api-response';
import { ServiceResult, ErrorCodes } from '@/services/base';

describe('Success Responses', () => {
  describe('successResponse', () => {
    it('creates a 200 response with data', async () => {
      const response = successResponse({ id: '123', name: 'Test' });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123', name: 'Test' });
    });

    it('allows custom status codes', async () => {
      const response = successResponse({ created: true }, 201);

      expect(response.status).toBe(201);
    });
  });

  describe('createdResponse', () => {
    it('creates a 201 response', async () => {
      const response = createdResponse({ id: 'new-123' });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 'new-123' });
    });
  });
});

describe('Error Responses', () => {
  describe('errorResponse', () => {
    it('creates an error response with correct structure', async () => {
      const response = errorResponse(ErrorCodes.NOT_FOUND, 'Resource not found');
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found');
    });

    it('includes details when provided', async () => {
      const response = errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid input',
        { field: 'email' }
      );
      const body = await response.json();

      expect(body.error.details).toEqual({ field: 'email' });
    });
  });

  describe('convenience error functions', () => {
    it('unauthorizedResponse returns 401', async () => {
      const response = unauthorizedResponse();

      expect(response.status).toBe(401);
    });

    it('forbiddenResponse returns 403', async () => {
      const response = forbiddenResponse();

      expect(response.status).toBe(403);
    });

    it('notFoundResponse returns 404', async () => {
      const response = notFoundResponse('Equipment');
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.message).toBe('Equipment not found');
    });

    it('validationErrorResponse returns 422', async () => {
      const response = validationErrorResponse('Invalid data', { field: 'email' });
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rateLimitedResponse returns 429', async () => {
      const response = rateLimitedResponse(60);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('internalErrorResponse returns 500', async () => {
      const response = internalErrorResponse();

      expect(response.status).toBe(500);
    });
  });
});

describe('ServiceResult Integration', () => {
  describe('serviceResultToResponse', () => {
    it('converts successful result to success response', async () => {
      const result = ServiceResult.ok({ id: '123' });
      const response = serviceResultToResponse(result);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123' });
    });

    it('converts failed result to error response', async () => {
      const result = ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Not found');
      const response = serviceResultToResponse(result);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('respects custom success status', async () => {
      const result = ServiceResult.ok({ id: '123' });
      const response = serviceResultToResponse(result, 201);

      expect(response.status).toBe(201);
    });
  });
});

describe('Auth Helpers', () => {
  describe('requireAuth', () => {
    it('returns null for authenticated session', () => {
      const session = { user: { id: 'user-123' } };
      const error = requireAuth(session);

      expect(error).toBeNull();
    });

    it('returns error for null session', () => {
      const error = requireAuth(null);

      expect(error).not.toBeNull();
      expect(error?.status).toBe(401);
    });

    it('returns error for session without user', () => {
      const session = { user: null };
      const error = requireAuth(session);

      expect(error).not.toBeNull();
    });

    it('returns error for session without user id', () => {
      const session = { user: {} };
      const error = requireAuth(session);

      expect(error).not.toBeNull();
    });
  });

  describe('requireVerifiedPhone', () => {
    it('returns null for verified phone', () => {
      const session = { user: { id: 'user-123', phoneVerified: true } };
      const error = requireVerifiedPhone(session);

      expect(error).toBeNull();
    });

    it('returns error for unverified phone', () => {
      const session = { user: { id: 'user-123', phoneVerified: false } };
      const error = requireVerifiedPhone(session);

      expect(error).not.toBeNull();
      expect(error?.status).toBe(403);
    });

    it('returns auth error for unauthenticated', () => {
      const error = requireVerifiedPhone(null);

      expect(error).not.toBeNull();
      expect(error?.status).toBe(401);
    });
  });

  describe('requireAdmin', () => {
    it('returns null for admin user', () => {
      const session = { user: { id: 'admin-123', role: 'ADMIN' } };
      const error = requireAdmin(session);

      expect(error).toBeNull();
    });

    it('returns error for non-admin user', () => {
      const session = { user: { id: 'user-123', role: 'RENTER' } };
      const error = requireAdmin(session);

      expect(error).not.toBeNull();
      expect(error?.status).toBe(403);
    });

    it('returns auth error for unauthenticated', () => {
      const error = requireAdmin(null);

      expect(error).not.toBeNull();
      expect(error?.status).toBe(401);
    });
  });
});
