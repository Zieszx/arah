// The warm-up must be invisible: it may never throw, never block, and
// never turn a prediction into anything other than a prediction. These
// tests pin that, plus the two details that make it actually warm
// something (GET, and no-store).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  warmModelService,
  warmModelServiceIfDeployed,
  resetWarmCooldown,
} from '@/lib/ml/warmModel.js';

describe('warmModelService', () => {
  beforeEach(() => resetWarmCooldown());

  it('issues a GET at the ML service and reports success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await expect(warmModelService(fetchImpl)).resolves.toBe(true);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/ml/health');
    expect(init.method).toBe('GET');
  });

  it('bypasses the cache — a cached 200 would warm nothing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await warmModelService(fetchImpl);
    expect(fetchImpl.mock.calls[0][1].cache).toBe('no-store');
  });

  it('reports false for a non-ok response without throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(warmModelService(fetchImpl)).resolves.toBe(false);
  });

  it('swallows a network failure — the submit path does the reporting', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(warmModelService(fetchImpl)).resolves.toBe(false);
  });

  it('swallows an abort, so a slow boot never surfaces to the student', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const fetchImpl = vi.fn().mockRejectedValue(abort);
    await expect(warmModelService(fetchImpl)).resolves.toBe(false);
  });

  it('resolves false when no fetch is available at all', async () => {
    await expect(warmModelService(null)).resolves.toBe(false);
  });

  it('never sends a body or a method that could mutate anything', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await warmModelService(fetchImpl);
    const init = fetchImpl.mock.calls[0][1];
    expect(init.body).toBeUndefined();
    expect(init.method).toBe('GET');
  });

  // A student resuming from localStorage mounts on the last question, so
  // both effects in QuizFlow fire in the same tick. The second must not
  // bill an invocation for an instance that is already warm.
  it('skips a second call inside the cooldown window', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    let clock = 1_000_000;
    const now = () => clock;

    await warmModelService(fetchImpl, now);
    await warmModelService(fetchImpl, now);
    clock += 59_000;
    await warmModelService(fetchImpl, now);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('warms again once the cooldown has elapsed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    let clock = 1_000_000;
    const now = () => clock;

    await warmModelService(fetchImpl, now);
    clock += 61_000;
    await warmModelService(fetchImpl, now);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('warmModelServiceIfDeployed', () => {
  // Guarded because the /api/ml rewrite only exists on a deployment; in
  // dev the request 404s and the browser logs it for no benefit.
  it('does nothing outside production', async () => {
    resetWarmCooldown();
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true });
    await expect(warmModelServiceIfDeployed()).resolves.toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
