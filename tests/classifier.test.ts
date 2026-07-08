import { describe, expect, it } from 'vitest';
import { classifyMessage } from '../src/services/classifier';

describe('classifyMessage', () => {
  it('classifies sales messages', () => {
    const result = classifyMessage('Can I book a demo and discuss pricing?');

    expect(result.category).toBe('sales');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('classifies support messages', () => {
    const result = classifyMessage('My account is not working and I need help');

    expect(result.category).toBe('support');
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('returns unknown when category is unclear', () => {
    const result = classifyMessage('Hello there');

    expect(result.category).toBe('unknown');
  });
});
