import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayInAppTimezone } from '../src/lib/dates.js';
import { pastDateSchema } from '../src/lib/schemas.js';

// Only Date is faked: the test database's timers keep running normally.
const at = (iso: string) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
};

afterEach(() => {
  vi.useRealTimers();
});

describe('dates in APP_TIMEZONE (Asia/Dhaka)', () => {
  it("knows Dhaka's calendar date while UTC is still on the previous day", () => {
    at('2026-11-15T20:00:00.000Z'); // 02:00 on the 16th in Dhaka
    expect(todayInAppTimezone()).toBe('2026-11-16');
  });

  it("accepts today's Dhaka date and rejects tomorrow", () => {
    at('2026-11-15T20:00:00.000Z');
    expect(pastDateSchema.safeParse('2026-11-16').success).toBe(true);
    expect(pastDateSchema.safeParse('2026-11-17').success).toBe(false);
  });

  it('compares full timestamps with the current instant', () => {
    at('2026-11-15T20:00:00.000Z');
    expect(pastDateSchema.safeParse('2026-11-15T19:59:00.000Z').success).toBe(true);
    expect(pastDateSchema.safeParse('2026-11-15T20:01:00.000Z').success).toBe(false);
  });
});
