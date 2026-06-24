import { createHmac } from 'node:crypto';
import type { OutboxEvent, XHookConfig } from './types';

const RETRY_DELAYS_MS = [0, 1_000, 5_000, 15_000];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref?.();
  return controller.signal;
}

function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username) parsed.username = '[redacted]';
    if (parsed.password) parsed.password = '[redacted]';
    for (const key of parsed.searchParams.keys()) {
      if (/token|secret|key|authorization/i.test(key)) parsed.searchParams.set(key, '[redacted]');
    }
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}

export interface HookDeliveryResult {
  delivered: boolean;
  attempts: number;
  error?: string;
}

export async function sendHookEvent(
  config: XHookConfig,
  outboxEvent: OutboxEvent
): Promise<HookDeliveryResult> {
  if (!config.enabled) return { delivered: false, attempts: 0, error: 'hook disabled' };
  if (!config.url) return { delivered: false, attempts: 0, error: 'hook url missing' };

  const body = {
    plugin: 'x-monitor',
    eventType: outboxEvent.event.eventType,
    eventId: outboxEvent.event.eventId,
    data: {
      account: outboxEvent.event.account,
      post: outboxEvent.event.post,
      detectedAt: outboxEvent.event.detectedAt
    }
  };
  const rawBody = JSON.stringify(body);

  let lastError = '';
  const maxAttempts = Math.max(1, config.maxRetries + 1);
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timestamp = new Date().toISOString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Plugin-Name': 'x-monitor',
      'X-Event-Id': outboxEvent.event.eventId,
      'X-Timestamp': timestamp
    };

    if (config.secret) {
      headers['X-Signature'] = createHmac('sha256', config.secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');
    }

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body: rawBody,
        signal: timeoutSignal(config.timeoutMs)
      });

      if (response.ok) return { delivered: true, attempts: attempt };

      lastError = `HTTP ${response.status} from ${redactUrl(config.url)}`;
      if (!isRetryableStatus(response.status)) {
        return { delivered: false, attempts: attempt, error: lastError };
      }

      const retryAfter = retryAfterMs(response.headers.get('Retry-After'));
      await delay(retryAfter ?? RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
    } catch (error: unknown) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      lastError = `${message} while posting to ${redactUrl(config.url)}`;
      if (attempt < maxAttempts) {
        await delay(RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
      }
    }
  }

  return { delivered: false, attempts: maxAttempts, error: lastError };
}
