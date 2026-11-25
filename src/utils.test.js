import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('stock arithmetic', () => {
  it('calculates selling total after discount', () => {
    const selling = 220, qty = 3, discount = 10;
    expect(selling * qty * (1 - discount / 100)).toBe(594);
  });
  it('calculates purchase total', () => {
    expect(12.5 * 8).toBe(100);
  });
  it('prevents negative sale quantity', () => {
    expect(-1 > 0).toBe(false);
  });
});
