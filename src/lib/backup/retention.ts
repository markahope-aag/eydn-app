/**
 * Backup retention policy.
 *
 * Daily backups live at  backups/eydn-backup-YYYY-MM-DD.json
 *
 * Policy (defaults):
 *   - keep every daily backup from the last 30 days
 *   - keep one backup per month (the most recent in each month) for 12 months
 *   - delete everything older
 *
 * Pure function so it can be unit-tested without touching R2.
 */

export const DAILY_RETENTION_DAYS = 30;
export const MONTHLY_RETENTION_MONTHS = 12;

const KEY_DATE_RE = /eydn-backup-(\d{4})-(\d{2})-(\d{2})\.json$/;

export interface RetentionOptions {
  referenceDate: Date;
  dailyDays?: number;
  monthlyMonths?: number;
}

interface Dated {
  key: string;
  date: Date;
  ym: string; // YYYY-MM
}

function parseKey(key: string): Dated | null {
  const m = key.match(KEY_DATE_RE);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  return { key, date, ym: `${y}-${mo}` };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Given backup keys, return the keys that should be DELETED under the policy.
 * Unparseable keys are left alone (never deleted).
 */
export function selectBackupsToDelete(keys: string[], opts: RetentionOptions): string[] {
  const dailyDays = opts.dailyDays ?? DAILY_RETENTION_DAYS;
  const monthlyMonths = opts.monthlyMonths ?? MONTHLY_RETENTION_MONTHS;
  const ref = opts.referenceDate;

  const parsed = keys
    .map(parseKey)
    .filter((x): x is Dated => x !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first

  const dailyCutoff = ref.getTime() - dailyDays * DAY_MS;

  // The oldest month we keep a monthly snapshot for.
  const monthlyCutoff = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - (monthlyMonths - 1), 1)
  );

  const keep = new Set<string>();
  const monthlyKeeperSeen = new Set<string>();

  for (const b of parsed) {
    // Within the daily window → always keep.
    if (b.date.getTime() >= dailyCutoff) {
      keep.add(b.key);
      continue;
    }
    // Older: keep one per month (the most recent, since list is newest-first),
    // but only for months within the monthly window.
    if (b.date.getTime() >= monthlyCutoff.getTime() && !monthlyKeeperSeen.has(b.ym)) {
      monthlyKeeperSeen.add(b.ym);
      keep.add(b.key);
    }
  }

  return parsed.filter((b) => !keep.has(b.key)).map((b) => b.key);
}
