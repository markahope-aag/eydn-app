/**
 * Lightweight API request logger. Emits a structured record (method, path,
 * status, duration) through the shared Pino logger, which ships to stdout and
 * Axiom in production.
 */
import { logger } from "@/lib/logger";

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  extra?: Record<string, unknown>
) {
  const fields = {
    method,
    path,
    status,
    durationMs: Math.round(durationMs),
    ...extra,
  };
  const msg = `${method} ${path} ${status}`;

  if (status >= 500) {
    logger.error(fields, msg);
  } else if (status >= 400) {
    logger.warn(fields, msg);
  } else {
    logger.info(fields, msg);
  }
}
