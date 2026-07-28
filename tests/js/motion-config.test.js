import { describe, it, expect } from 'vitest';
import { SAND, SPOTLIGHT, FIELD } from '@/lib/motion/config.js';

describe('tuned motion values', () => {
  it('preserves the exact values the client tuned', () => {
    expect(SAND.speed).toBe(0.03);
    expect(SAND.settle).toBe(0.97);
    expect(SAND.trailDecay).toBe(0.003);
    expect(SAND.grainsPerMove).toBe(10);
    expect(SPOTLIGHT.size).toBe(100);
    expect(FIELD.drift).toBe(0.20);
    expect(FIELD.density).toBe(7000);
    expect(FIELD.linkDistance).toBe(62);
  });
});
