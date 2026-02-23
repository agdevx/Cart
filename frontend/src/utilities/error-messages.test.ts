// ABOUTME: Tests for error message utility
// ABOUTME: Verifies error code to user-friendly message mapping

import { describe, expect,it } from 'vitest';

import { ERROR_MESSAGES,getErrorMessage } from './error-messages';

describe('error-messages', () => {
  describe('ERROR_MESSAGES', () => {
    it('should have UNKNOWN_ERROR defined', () => {
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should have NETWORK_ERROR defined', () => {
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('should have UNAUTHORIZED defined', () => {
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBe(
        'You are not authorized to perform this action.'
      );
    });

    it('should have INVALID_CREDENTIALS defined', () => {
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe(
        'Invalid email or password.'
      );
    });
  });

  describe('getErrorMessage', () => {
    it('should return correct message for known error code', () => {
      expect(getErrorMessage('NETWORK_ERROR')).toBe(
        ERROR_MESSAGES.NETWORK_ERROR
      );
      expect(getErrorMessage('UNAUTHORIZED')).toBe(
        ERROR_MESSAGES.UNAUTHORIZED
      );
      expect(getErrorMessage('INVALID_CREDENTIALS')).toBe(
        ERROR_MESSAGES.INVALID_CREDENTIALS
      );
    });

    it('should return UNKNOWN_ERROR message for unknown error code', () => {
      expect(getErrorMessage('SOME_RANDOM_ERROR')).toBe(
        ERROR_MESSAGES.UNKNOWN_ERROR
      );
      expect(getErrorMessage('NOT_A_REAL_ERROR')).toBe(
        ERROR_MESSAGES.UNKNOWN_ERROR
      );
    });

    it('should return UNKNOWN_ERROR message when code is undefined', () => {
      expect(getErrorMessage(undefined as never)).toBe(
        ERROR_MESSAGES.UNKNOWN_ERROR
      );
    });

    it('should return UNKNOWN_ERROR message when code is null', () => {
      expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    });

    it('should extract message from Error objects with known error code', () => {
      expect(getErrorMessage(new Error('NETWORK_ERROR'))).toBe(
        ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('should return error message from Error objects with unknown code', () => {
      expect(getErrorMessage(new Error('Something went wrong'))).toBe(
        'Something went wrong'
      );
    });

    it('should return UNKNOWN_ERROR for non-string, non-Error values', () => {
      expect(getErrorMessage(42)).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
      expect(getErrorMessage({})).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
    });
  });
});
