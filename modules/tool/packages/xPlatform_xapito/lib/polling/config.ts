import { join } from 'node:path';
import { XReadConfigSchema } from '../schemas';
import type { XPollingConfig } from './types';

const DEFAULT_INTERVAL_MS = 300_000;
const MIN_INTERVAL_MS = 60_000;
const DEFAULT_HOOK_TIMEOUT_MS = 10_000;
const DEFAULT_HOOK_RETRIES = 3;
const DEFAULT_CONCURRENCY = 4;

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  console.warn(`Invalid ${name}=${value}; using ${fallback}`);
  return fallback;
}

function envInt(name: string, fallback: number, min?: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || (min !== undefined && parsed < min)) {
    console.warn(`Invalid ${name}=${value}; using ${fallback}`);
    return fallback;
  }
  return parsed;
}

function envList(name: string): string[] {
  return (process.env[name] ?? '')
    .split(/[\s,，;；]+/)
    .map((item) => item.trim().replace(/^@+/, '').toLowerCase())
    .filter(Boolean);
}

export function loadXPollingConfig(): XPollingConfig {
  const readConfig = XReadConfigSchema.parse({
    bearerToken: process.env.X_BEARER_TOKEN ?? process.env.X_READ_TOKEN ?? process.env.X_API_TOKEN,
    baseUrl: process.env.X_API_BASE_URL ?? process.env.X_BASE_URL ?? 'https://x.p.xapi.to',
    proxyUrl: process.env.X_API_PROXY_URL,
    timeoutMs: envInt('X_API_TIMEOUT_MS', 15_000, 1_000),
    defaultMaxResults: envInt('X_POLLING_MAX_RESULTS', 10, 5)
  });

  return {
    enabled: envBool('X_POLLING_ENABLED', false),
    intervalMs: envInt('X_POLLING_INTERVAL_MS', DEFAULT_INTERVAL_MS, MIN_INTERVAL_MS),
    runImmediately: envBool('X_POLLING_RUN_IMMEDIATELY', true),
    concurrency: envInt('X_POLLING_CONCURRENCY', DEFAULT_CONCURRENCY, 1),
    accounts: envList('X_POLLING_ACCOUNTS'),
    stateFile:
      process.env.X_POLLING_STATE_FILE ??
      join(process.cwd(), 'data', 'xPlatform_xapito', 'polling-state.json'),
    readConfig,
    hook: {
      enabled: envBool('X_HOOK_ENABLED', false),
      url: process.env.X_HOOK_URL,
      secret: process.env.X_HOOK_SECRET,
      timeoutMs: envInt('X_HOOK_TIMEOUT_MS', DEFAULT_HOOK_TIMEOUT_MS, 1_000),
      maxRetries: envInt('X_HOOK_MAX_RETRIES', DEFAULT_HOOK_RETRIES, 1)
    }
  };
}
