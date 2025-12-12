/**
 * Base Service Tests
 *
 * Tests for the ServiceResult pattern and utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  ServiceResult,
  ErrorCodes,
  errorCodeToHttpStatus,
  isValidSaudiPhone,
  isValidBahrainPhone,
  isValidPhone,
} from '@/services/base';

describe('ServiceResult', () => {
  describe('ok()', () => {
    it('creates a successful result with data', () => {
      const result = ServiceResult.ok({ id: '123', name: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
      expect(result.error).toBeUndefined();
    });

    it('works with primitive values', () => {
      const stringResult = ServiceResult.ok('hello');
      const numberResult = ServiceResult.ok(42);
      const boolResult = ServiceResult.ok(true);

      expect(stringResult.data).toBe('hello');
      expect(numberResult.data).toBe(42);
      expect(boolResult.data).toBe(true);
    });

    it('works with arrays', () => {
      const result = ServiceResult.ok([1, 2, 3]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('fail()', () => {
    it('creates a failed result with error', () => {
      const result = ServiceResult.fail(
        ErrorCodes.NOT_FOUND,
        'Equipment not found'
      );

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'NOT_FOUND',
        message: 'Equipment not found',
        details: undefined,
      });
    });

    it('includes error details when provided', () => {
      const result = ServiceResult.fail(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid input',
        { field: 'email', issue: 'invalid format' }
      );

      expect(result.error?.details).toEqual({
        field: 'email',
        issue: 'invalid format',
      });
    });
  });

  describe('map()', () => {
    it('transforms data on success', () => {
      const result = ServiceResult.ok({ count: 5 });
      const mapped = result.map((data) => data.count * 2);

      expect(mapped.success).toBe(true);
      expect(mapped.data).toBe(10);
    });

    it('preserves error on failure', () => {
      const result = ServiceResult.fail<{ count: number }>(
        ErrorCodes.NOT_FOUND,
        'Not found'
      );
      const mapped = result.map((data) => data.count * 2);

      expect(mapped.success).toBe(false);
      expect(mapped.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('unwrap()', () => {
    it('returns data on success', () => {
      const result = ServiceResult.ok({ value: 'test' });

      expect(result.unwrap()).toEqual({ value: 'test' });
    });

    it('throws on failure', () => {
      const result = ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Not found');

      expect(() => result.unwrap()).toThrow('Not found');
    });
  });

  describe('unwrapOr()', () => {
    it('returns data on success', () => {
      const result = ServiceResult.ok('actual');

      expect(result.unwrapOr('default')).toBe('actual');
    });

    it('returns default value on failure', () => {
      const result = ServiceResult.fail<string>(ErrorCodes.NOT_FOUND, 'Not found');

      expect(result.unwrapOr('default')).toBe('default');
    });
  });

  describe('hasErrorCode()', () => {
    it('returns true for matching error code', () => {
      const result = ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Not found');

      expect(result.hasErrorCode(ErrorCodes.NOT_FOUND)).toBe(true);
    });

    it('returns false for non-matching error code', () => {
      const result = ServiceResult.fail(ErrorCodes.NOT_FOUND, 'Not found');

      expect(result.hasErrorCode(ErrorCodes.UNAUTHORIZED)).toBe(false);
    });

    it('returns false for successful results', () => {
      const result = ServiceResult.ok('data');

      expect(result.hasErrorCode(ErrorCodes.NOT_FOUND)).toBe(false);
    });
  });
});

describe('errorCodeToHttpStatus', () => {
  it('maps authentication errors to 401', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.UNAUTHORIZED)).toBe(401);
    expect(errorCodeToHttpStatus(ErrorCodes.SESSION_EXPIRED)).toBe(401);
  });

  it('maps authorization errors to 403', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.FORBIDDEN)).toBe(403);
    expect(errorCodeToHttpStatus(ErrorCodes.PHONE_NOT_VERIFIED)).toBe(403);
  });

  it('maps not found errors to 404', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.NOT_FOUND)).toBe(404);
  });

  it('maps conflict errors to 409', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.CONFLICT)).toBe(409);
    expect(errorCodeToHttpStatus(ErrorCodes.ALREADY_EXISTS)).toBe(409);
    expect(errorCodeToHttpStatus(ErrorCodes.BOOKING_CONFLICT)).toBe(409);
  });

  it('maps validation errors to 422', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.VALIDATION_ERROR)).toBe(422);
    expect(errorCodeToHttpStatus(ErrorCodes.INVALID_INPUT)).toBe(422);
    expect(errorCodeToHttpStatus(ErrorCodes.PRICE_REQUIRED)).toBe(422);
  });

  it('maps rate limit errors to 429', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.RATE_LIMITED)).toBe(429);
    expect(errorCodeToHttpStatus(ErrorCodes.TOO_MANY_REQUESTS)).toBe(429);
  });

  it('maps external service errors to 502', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.SMS_FAILED)).toBe(502);
    expect(errorCodeToHttpStatus(ErrorCodes.AI_SERVICE_ERROR)).toBe(502);
    expect(errorCodeToHttpStatus(ErrorCodes.STORAGE_ERROR)).toBe(502);
  });

  it('maps internal errors to 500', () => {
    expect(errorCodeToHttpStatus(ErrorCodes.INTERNAL_ERROR)).toBe(500);
    expect(errorCodeToHttpStatus(ErrorCodes.DATABASE_ERROR)).toBe(500);
  });
});

describe('Phone Validation', () => {
  describe('isValidSaudiPhone', () => {
    it('accepts valid Saudi phone numbers with +966 prefix', () => {
      expect(isValidSaudiPhone('+966501234567')).toBe(true);
      expect(isValidSaudiPhone('+966512345678')).toBe(true);
      expect(isValidSaudiPhone('+966 50 123 4567')).toBe(true); // with spaces
    });

    it('accepts valid Saudi phone numbers with 05 prefix', () => {
      expect(isValidSaudiPhone('0501234567')).toBe(true);
      expect(isValidSaudiPhone('0512345678')).toBe(true);
    });

    it('rejects invalid Saudi phone numbers', () => {
      expect(isValidSaudiPhone('1234567')).toBe(false);
      expect(isValidSaudiPhone('+1501234567')).toBe(false);
      expect(isValidSaudiPhone('+973501234567')).toBe(false);
    });
  });

  describe('isValidBahrainPhone', () => {
    it('accepts valid Bahrain phone numbers', () => {
      expect(isValidBahrainPhone('+97312345678')).toBe(true);
      expect(isValidBahrainPhone('+973 1234 5678')).toBe(true); // with spaces
    });

    it('rejects invalid Bahrain phone numbers', () => {
      expect(isValidBahrainPhone('12345678')).toBe(false);
      expect(isValidBahrainPhone('+96612345678')).toBe(false);
      expect(isValidBahrainPhone('+9731234567')).toBe(false); // too short
    });
  });

  describe('isValidPhone', () => {
    it('validates Saudi phones when country is SA', () => {
      expect(isValidPhone('+966501234567', 'SA')).toBe(true);
      expect(isValidPhone('+97312345678', 'SA')).toBe(false);
    });

    it('validates Bahrain phones when country is BH', () => {
      expect(isValidPhone('+97312345678', 'BH')).toBe(true);
      expect(isValidPhone('+966501234567', 'BH')).toBe(false);
    });
  });
});
