import { describe, it, expect } from 'vitest';
import { buildHash, neighbours } from '@/components/motion/spatial-hash.js';

describe('spatial hash', () => {
  const cell = 62;

  it('buckets particles by cell', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 500, y: 500 }];
    const hash = buildHash(pts, cell);
    expect(hash.size).toBe(2);
  });

  it('returns near particles and excludes far ones', () => {
    const near = { x: 20, y: 20 };
    const far = { x: 900, y: 900 };
    const subject = { x: 10, y: 10 };
    const hash = buildHash([subject, near, far], cell);
    const found = neighbours(hash, subject, cell);
    expect(found).toContain(near);
    expect(found).not.toContain(far);
  });

  it('finds neighbours across an adjacent cell boundary', () => {
    const a = { x: cell - 1, y: 10 };
    const b = { x: cell + 1, y: 10 };
    const hash = buildHash([a, b], cell);
    expect(neighbours(hash, a, cell)).toContain(b);
  });
});
