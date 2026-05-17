import pino, { type Logger, multistream, type StreamEntry } from "pino";
import { Writable } from "node:stream";

declare const EdgeRuntime: unknown;
const isEdge = typeof EdgeRuntime !== "undefined";

const axiomToken = process.env.AXIOM_TOKEN;
const defaultDataset = process.env.AXIOM_DATASET ?? "eydn-app";

const baseFields = {
  service: "eydn-app",
  env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  region: process.env.VERCEL_REGION,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
};

const level = process.env.LOG_LEVEL ?? "info";

const redact = {
  paths: [
    "*.password",
    "*.token",
    "*.apiKey",
    "*.api_key",
    "*.secret",
    "*.authorization",
    "req.headers.authorization",
    "req.headers.cookie",
    "headers.authorization",
    "headers.cookie",
    "AXIOM_TOKEN",
    "CRON_SECRET",
    "CLERK_SECRET_KEY",
    "STRIPE_SECRET_KEY",
    "TWILIO_AUTH_TOKEN",
    "VAPID_PRIVATE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  remove: true,
};

/**
 * Direct HTTP sink to Axiom's ingest endpoint. Uses fetch (no worker threads,
 * no pino transports) so it works in Vercel serverless. Each pino log line is
 * one JSON record posted with keepalive so it survives the lambda completing.
 *
 * NEVER swap this for `pino.transport()` — transports spawn worker threads
 * which Vercel serverless can't host. Every route importing the logger would
 * 500 on cold start. See orbitabm CLAUDE.md for the full story.
 */
function makeAxiomSink(dataset: string): Writable {
  return new Writable({
    write(chunk, _enc, callback) {
      const line = chunk.toString().trim();
      if (line.length === 0) return callback();
      try {
        const record = JSON.parse(line);
        void fetch(`https://api.axiom.co/v1/datasets/${dataset}/ingest`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${axiomToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([record]),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // malformed line — drop
      }
      callback();
    },
  });
}

function buildLogger(dataset: string): Logger {
  const axiomEnabled = Boolean(axiomToken) && !isEdge;
  if (!axiomEnabled) {
    return pino({ level, base: { ...baseFields, dataset }, redact });
  }

  const streams: StreamEntry[] = [
    { level: level as pino.Level, stream: process.stdout },
    { level: level as pino.Level, stream: makeAxiomSink(dataset) },
  ];

  return pino({ level, base: { ...baseFields, dataset }, redact }, multistream(streams));
}

declare global {
  var __eydnLoggers: Map<string, Logger> | undefined;
}

const cache: Map<string, Logger> = globalThis.__eydnLoggers ?? new Map();
if (process.env.NODE_ENV !== "production") globalThis.__eydnLoggers = cache;

export function createLogger(dataset: string = defaultDataset): Logger {
  const cached = cache.get(dataset);
  if (cached) return cached;
  const built = buildLogger(dataset);
  cache.set(dataset, built);
  return built;
}

export const logger: Logger = createLogger(defaultDataset);

/**
 * Return a child logger bound to the request's id. The proxy is welcome
 * to mint one and set `x-request-id`, but if absent we fall back to
 * "unknown" — no need to gate logging on the header being present.
 */
export function createRequestLogger(
  request: { headers: { get(name: string): string | null } },
  parent: Logger = logger,
): Logger {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  return parent.child({ requestId });
}

export type { Logger } from "pino";
