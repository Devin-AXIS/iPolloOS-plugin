import type { XReadConfig } from '../schemas';

export interface AccountPollingState {
  userId?: string;
  username: string;
  lastPostId: string | null;
  newestPostId: string | null;
  checkedAt: string;
  lastSuccessAt?: string;
  lastError?: string;
}

export interface XPostEvent {
  eventId: string;
  eventType: 'x.post.created';
  source: 'x';
  account: {
    userId: string;
    username: string;
  };
  post: {
    id: string;
    text: string;
    url: string;
    createdAt: string | null;
    postType?: 'original' | 'retweet' | 'reply' | 'quote';
    authorUsername?: string;
  };
  detectedAt: string;
}

export interface OutboxEvent {
  event: XPostEvent;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface XPollingState {
  version: number;
  accounts: Record<string, AccountPollingState>;
  outbox: OutboxEvent[];
  checkedAt: string | null;
}

export interface XHookConfig {
  enabled: boolean;
  url?: string;
  secret?: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface XPollingConfig {
  enabled: boolean;
  intervalMs: number;
  runImmediately: boolean;
  concurrency: number;
  accounts: string[];
  stateFile: string;
  readConfig: XReadConfig;
  hook: XHookConfig;
}

export interface PollResult {
  skipped: boolean;
  accounts: number;
  successful: number;
  failed: number;
  newEvents: number;
  hookDelivered: number;
  pendingEvents: number;
  durationMs: number;
  errors: string[];
}

export interface XPollingStatus {
  running: boolean;
  polling: boolean;
  intervalMs: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSuccessAt: string | null;
  accounts: number;
  pendingEvents: number;
  lastError: string | null;
}
