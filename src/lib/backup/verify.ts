import { isR2Configured, listObjects, getObjectText } from "./r2";

/**
 * Independent verification that last night's backup actually worked. This does
 * NOT trust the backup job's own success flag — it reads the latest object back
 * out of R2 and checks it is recent, non-trivial, parseable, and contains the
 * weddings we expect. That makes it a real restorability check, not just a
 * "did the job run" check.
 */

export const BACKUP_MAX_AGE_HOURS = 26;
// A real backup is well over a megabyte; anything tiny means an empty/corrupt export.
export const BACKUP_MIN_BYTES = 1000;

export interface BackupMeta {
  ageHours: number | null;
  bytes: number | null;
  weddingCount: number | null;
  liveWeddingCount: number;
  hasWeddingsArray: boolean;
  firstWeddingHasData: boolean;
}

/**
 * Pure rule evaluation — given the facts about the latest backup, return a list
 * of human-readable problems. Empty list = healthy. Unit-tested in isolation.
 */
export function assessBackup(meta: BackupMeta): string[] {
  const problems: string[] = [];

  if (meta.ageHours == null || meta.ageHours > BACKUP_MAX_AGE_HOURS) {
    problems.push(
      `Latest backup is ${
        meta.ageHours == null ? "of unknown age" : `${meta.ageHours.toFixed(1)}h old`
      } (expected within ${BACKUP_MAX_AGE_HOURS}h).`
    );
  }

  if (meta.bytes == null || meta.bytes < BACKUP_MIN_BYTES) {
    problems.push(`Latest backup is only ${meta.bytes ?? 0} bytes — suspiciously small.`);
  }

  if (!meta.hasWeddingsArray) {
    problems.push("Backup JSON has no weddings array — format is wrong or the file is corrupt.");
  } else if (meta.weddingCount === 0) {
    problems.push("Backup contains 0 weddings — the export captured no data.");
  } else if (
    meta.weddingCount != null &&
    meta.liveWeddingCount > 0 &&
    meta.weddingCount < meta.liveWeddingCount
  ) {
    problems.push(
      `Backup has ${meta.weddingCount} weddings but the live database has ${meta.liveWeddingCount} — data may be missing.`
    );
  }

  if (meta.hasWeddingsArray && meta.weddingCount && meta.weddingCount > 0 && !meta.firstWeddingHasData) {
    problems.push("Backup weddings are missing their data payload.");
  }

  return problems;
}

export interface BackupVerification {
  ok: boolean;
  problems: string[];
  latestKey: string | null;
  ageHours: number | null;
  bytes: number | null;
  weddingCount: number | null;
  liveWeddingCount: number;
}

/**
 * Download and validate the most recent daily backup in R2.
 * @param liveWeddingCount current count of weddings in the DB (for completeness check)
 * @param nowMs current time in ms (injectable for testing)
 */
export async function verifyLatestBackup(
  liveWeddingCount: number,
  nowMs: number
): Promise<BackupVerification> {
  const base: BackupVerification = {
    ok: false,
    problems: [],
    latestKey: null,
    ageHours: null,
    bytes: null,
    weddingCount: null,
    liveWeddingCount,
  };

  if (!isR2Configured()) {
    return { ...base, problems: ["R2 is not configured — backups are NOT being stored off-platform."] };
  }

  let objects;
  try {
    objects = await listObjects("backups/");
  } catch (e) {
    return { ...base, problems: [`Could not list backups in R2: ${e instanceof Error ? e.message : String(e)}`] };
  }

  if (objects.length === 0) {
    return { ...base, problems: ["No backup objects found in R2."] };
  }

  const latest = [...objects].sort(
    (a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0)
  )[0];

  base.latestKey = latest.key;
  base.bytes = latest.size;
  base.ageHours = latest.lastModified ? (nowMs - latest.lastModified.getTime()) / 3_600_000 : null;

  let hasWeddingsArray = false;
  let firstWeddingHasData = false;
  let weddingCount: number | null = null;

  // Read it back and parse — this is the real restorability check.
  try {
    const text = await getObjectText(latest.key);
    const parsed = JSON.parse(text);
    hasWeddingsArray = Array.isArray(parsed.weddings);
    if (hasWeddingsArray) {
      weddingCount = parsed.weddings.length;
      firstWeddingHasData = weddingCount === 0 ? true : Boolean(parsed.weddings[0]?.data);
    }
  } catch (e) {
    return {
      ...base,
      weddingCount,
      problems: [`Could not download/parse the latest backup (${latest.key}): ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  base.weddingCount = weddingCount;
  const problems = assessBackup({
    ageHours: base.ageHours,
    bytes: base.bytes,
    weddingCount,
    liveWeddingCount,
    hasWeddingsArray,
    firstWeddingHasData,
  });

  return { ...base, weddingCount, problems, ok: problems.length === 0 };
}
