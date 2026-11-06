import { describe, it, expect } from 'vitest';
import { compressWithHeadroom, estimateTokens } from '../utils/headroomCompressor';

describe('Headroom Token Compression Utility', () => {
  it('estimates token count accurately based on character length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('12345678')).toBe(2);
  });

  it('handles empty string gracefully without NaN savings', () => {
    const result = compressWithHeadroom('');
    expect(result.originalTokensEstimate).toBe(0);
    expect(result.compressedTokensEstimate).toBe(0);
    expect(result.savingsPercentage).toBe(0);
    expect(Number.isNaN(result.savingsPercentage)).toBe(false);
  });

  it('compresses repetitive JSON array into schema tuples with substantial savings', () => {
    const rawArray = [
      { id: 1, name: 'Customer A', email: 'a@example.com', status: 'ACTIVE', category: 'ENTERPRISE' },
      { id: 2, name: 'Customer B', email: 'b@example.com', status: 'ACTIVE', category: 'ENTERPRISE' },
      { id: 3, name: 'Customer C', email: 'c@example.com', status: 'ACTIVE', category: 'ENTERPRISE' },
      { id: 4, name: 'Customer D', email: 'd@example.com', status: 'ACTIVE', category: 'ENTERPRISE' },
      { id: 5, name: 'Customer E', email: 'e@example.com', status: 'ACTIVE', category: 'ENTERPRISE' }
    ];

    const result = compressWithHeadroom(rawArray);

    expect(result.isCompressed).toBe(true);
    expect(result.compressedText).toContain('_headroom');
    expect(result.compressedText).toContain('schema');
    expect(result.savingsPercentage).toBeGreaterThan(0);
  });

  it('compacts single JSON object without whitespace', () => {
    const rawObj = {
      jobId: 'job-101',
      errorCode: 'INVALID_DOMAIN',
      message: 'Corporate policy violation'
    };

    const result = compressWithHeadroom(rawObj);

    expect(result.originalTokensEstimate).toBeGreaterThanOrEqual(result.compressedTokensEstimate);
    expect(result.compressedText).toContain('INVALID_DOMAIN');
  });

  it('collapses repeated log lines into count aggregates', () => {
    const rawLogs = 'Connection established\nHeartbeat\nHeartbeat\nHeartbeat\nQuery completed';
    const result = compressWithHeadroom(rawLogs);

    expect(result.compressedText).toContain('[repeated 2x]');
    expect(result.compressedText).toContain('Query completed');
  });
});
