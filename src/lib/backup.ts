import { queueKey } from './discovery.ts';
import { focusKey, scratchpadKey } from './tools.ts';

export const backupKeys = [
  'launchpad-preferences',
  'launchpad-links',
  'launchpad-history',
  queueKey,
  scratchpadKey,
  focusKey,
] as const;

const format = 'hush-backup';
const maxBackupSize = 2_000_000;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createBackup(store: Store, now = new Date()): string {
  const data: Record<string, string> = {};
  for (const key of backupKeys) {
    const value = store.getItem(key);
    if (value !== null) data[key] = value;
  }
  return JSON.stringify(
    { format, version: 1, exportedAt: now.toISOString(), data },
    null,
    2,
  );
}

// Returns the number of restored sections, or null if the file is not a valid hush backup.
export function restoreBackup(text: string, store: Store): number | null {
  if (text.length > maxBackupSize) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const file = parsed as Record<string, unknown>;
  if (file.format !== format || file.version !== 1) return null;
  if (!file.data || typeof file.data !== 'object') return null;
  const data = file.data as Record<string, unknown>;
  const entries: [string, string][] = [];
  for (const key of backupKeys) {
    const value = data[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') return null;
    entries.push([key, value]);
  }
  if (entries.length === 0) return null;
  try {
    for (const key of backupKeys) store.removeItem(key);
    for (const [key, value] of entries) store.setItem(key, value);
  } catch {
    return null;
  }
  return entries.length;
}
