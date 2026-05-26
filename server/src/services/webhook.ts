const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "";

interface WebhookPayload {
  event: "key_disabled" | "rate_spike";
  timestamp: string;
  platform?: string;
  keyId?: number;
  label?: string;
  message: string;
}

function isConfigured(): boolean {
  return WEBHOOK_URL.length > 0 && WEBHOOK_URL.startsWith("http");
}

export async function fireWebhook(payload: WebhookPayload): Promise<void> {
  if (!isConfigured()) return;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[Webhook] HTTP ${res.status} sending ${payload.event}`);
    }
  } catch (err: any) {
    // Don't let webhook failures cascade — log and move on
    console.error(`[Webhook] ${err.message} for ${payload.event}`);
  }
}

export function fireKeyDisabled(
  platform: string,
  keyId: number,
  label: string,
): void {
  fireWebhook({
    event: "key_disabled",
    timestamp: new Date().toISOString(),
    platform,
    keyId,
    label,
    message: `Key ${label || keyId} on ${platform} auto-disabled after consecutive health check failures`,
  });
}

// Track recent 429s per platform-model-key to detect spikes
const rateSpikeTracker = new Map<string, number[]>();
const SPIKE_WINDOW_MS = 5 * 60 * 1000; // 5 min
const SPIKE_THRESHOLD = 10; // 10+ 429s in window = spike

export function trackRateSpike(
  platform: string,
  modelId: string,
  keyId: number,
): void {
  const key = `${platform}:${modelId}:${keyId}`;
  const now = Date.now();
  const hits = (rateSpikeTracker.get(key) ?? []).filter(
    (t) => t > now - SPIKE_WINDOW_MS,
  );
  hits.push(now);
  rateSpikeTracker.set(key, hits);

  if (hits.length === SPIKE_THRESHOLD) {
    fireWebhook({
      event: "rate_spike",
      timestamp: new Date().toISOString(),
      platform,
      keyId,
      message: `Rate limit spike on ${platform}/${modelId}: ${hits.length} 429s in ${SPIKE_WINDOW_MS / 60000}min`,
    });
    // Reset counter with one entry to avoid repeated fires for the same spike
    rateSpikeTracker.set(key, [now]);
  }
}
