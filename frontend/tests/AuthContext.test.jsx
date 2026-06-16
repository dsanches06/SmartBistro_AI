import { beforeEach, describe, expect, it } from 'vitest';
import { createSingleSessionGuard, LOCK_KEY } from '../src/context/sessionGuard';

describe('createSingleSessionGuard', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.cookie = `${LOCK_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });

  it('blocks a second session while one is already active', () => {
    const first = createSingleSessionGuard({
      storage: window.sessionStorage,
      channel: null,
      sessionId: 'tab-1',
    });

    const second = createSingleSessionGuard({
      storage: window.sessionStorage,
      channel: null,
      sessionId: 'tab-2',
    });

    expect(first.acquire()).toMatchObject({ ok: true });
    expect(second.acquire()).toEqual({ ok: false, reason: 'SESSION_BUSY' });
  });
});
