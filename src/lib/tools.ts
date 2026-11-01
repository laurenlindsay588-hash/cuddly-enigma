export const scratchpadKey = 'hush-scratchpad-v3';
export const focusKey = 'hush-focus-v3';
export const scratchpadLimit = 10000;
export const focusDurations = [5, 15, 25] as const;

export type FocusSession = {
  minutes: number;
  remaining: number;
  endsAt: number | null;
};

export function freshSession(minutes = 25): FocusSession {
  return { minutes, remaining: minutes * 60, endsAt: null };
}

// Use a deadline so background suspension and reopening don't slow the timer.
export function remainingSeconds(session: FocusSession, now = Date.now()) {
  return session.endsAt === null
    ? session.remaining
    : Math.max(
        0,
        Math.min(
          session.minutes * 60,
          Math.ceil((session.endsAt - now) / 1000),
        ),
      );
}

export function toggleSession(
  session: FocusSession,
  now = Date.now(),
): FocusSession {
  const remaining = remainingSeconds(session, now);
  if (session.endsAt !== null) return { ...session, remaining, endsAt: null };
  const next = remaining > 0 ? remaining : session.minutes * 60;
  return { ...session, remaining: next, endsAt: now + next * 1000 };
}

export function readFocus(): FocusSession {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(focusKey) ?? 'null');
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>;
      if (
        focusDurations.includes(item.minutes as 5 | 15 | 25) &&
        typeof item.remaining === 'number' &&
        Number.isInteger(item.remaining) &&
        item.remaining >= 0 &&
        item.remaining <= (item.minutes as number) * 60 &&
        (item.endsAt === null ||
          (typeof item.endsAt === 'number' &&
            Number.isSafeInteger(item.endsAt) &&
            item.endsAt >= 0))
      ) {
        return item as FocusSession;
      }
    }
  } catch {
    /* Storage may be unavailable. */
  }
  return freshSession();
}

export function readScratchpad(): string {
  try {
    return (localStorage.getItem(scratchpadKey) ?? '').slice(
      0,
      scratchpadLimit,
    );
  } catch {
    return '';
  }
}

export function saveTool(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function wordCount(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}
