import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export type ServerEventProperties = Record<string, string | number | boolean | null | undefined>;

export async function captureServer(
  userId: string,
  event: string,
  properties: ServerEventProperties = {}
): Promise<void> {
  const posthog = getPostHog();
  if (!posthog) return;
  posthog.capture({
    distinctId: userId,
    event,
    properties,
  });
  try {
    await posthog.flush();
  } catch {
    // swallow — never let analytics break the caller
  }
}

export async function identifyServer(
  userId: string,
  properties: ServerEventProperties = {}
): Promise<void> {
  const posthog = getPostHog();
  if (!posthog) return;
  posthog.identify({ distinctId: userId, properties });
  try {
    await posthog.flush();
  } catch {
    // swallow
  }
}

// Sonnet-class rates, USD per token. Estimates only — adjust when model changes.
const CLAUDE_INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const CLAUDE_OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export function estimateClaudeCostUsd(
  inputTokens: number,
  outputTokens: number
): number {
  const cost =
    inputTokens * CLAUDE_INPUT_COST_PER_TOKEN +
    outputTokens * CLAUDE_OUTPUT_COST_PER_TOKEN;
  return Math.round(cost * 10000) / 10000;
}
