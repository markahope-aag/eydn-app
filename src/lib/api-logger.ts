/**
 * Lightweight API request logger.
 * Logs method, path, status, and duration to console.
 * In production, pipe these to a logging service (Datadog, Axiom, etc.).
 */

export function logRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number,
  extra?: Record<string, unknown>
) {
  const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
  const entry = {
    level,
    method,
    path,
    status,
    durationMs: Math.round(durationMs),
    timestamp: new Date().toISOString(),
    ...extra,
  };

  if (level === "ERROR") {
    console.error("[API]", JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn("[API]", JSON.stringify(entry));
  } else {
    console.log("[API]", JSON.stringify(entry));
  }
}

/**
 * Wrap an API route handler with automatic request logging.
 */
export function withLogging<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    const start = Date.now();
    const request = args[0] as Request | undefined;
    const method = request?.method ?? "UNKNOWN";
    const path = request?.url ? new URL(request.url).pathname : "unknown";

    try {
      const response = await handler(...args);
      logRequest(method, path, response.status, Date.now() - start);
      return response;
    } catch (error) {
      logRequest(method, path, 500, Date.now() - start, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }) as T;
}
