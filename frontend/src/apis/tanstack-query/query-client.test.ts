// ABOUTME: Tests for Tanstack Query client configuration
// ABOUTME: Verifies query client is properly configured with default options

import { describe, it, expect } from 'vitest';
import { queryClient } from './query-client';

describe('queryClient', () => {
  it('should be defined', () => {
    expect(queryClient).toBeDefined();
  });

  it('should have default options configured', () => {
    const defaultOptions = queryClient.getDefaultOptions();

    expect(defaultOptions.queries).toBeDefined();
    expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5); // 5 minutes
    expect(defaultOptions.queries?.retry).toBe(1);
  });

  it('should be an instance of QueryClient', () => {
    expect(queryClient.constructor.name).toBe('QueryClient');
  });
});
