import { getDb } from "../db/index.js";

const RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS ?? "30", 10);
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function pruneOldLogs(): number {
  const db = getDb();
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const result = db
    .prepare("DELETE FROM requests WHERE created_at < ?")
    .run(cutoff);
  if (result.changes > 0) {
    console.log(
      `[Cleanup] Pruned ${result.changes} request rows older than ${RETENTION_DAYS} days`,
    );
  }
  return result.changes;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startCleanup(): void {
  if (intervalId) return;
  console.log(
    `[Cleanup] Starting log retention (${RETENTION_DAYS} days, every ${CLEANUP_INTERVAL_MS / 60000} min)`,
  );
  pruneOldLogs();
  intervalId = setInterval(pruneOldLogs, CLEANUP_INTERVAL_MS);
}

export function stopCleanup(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
