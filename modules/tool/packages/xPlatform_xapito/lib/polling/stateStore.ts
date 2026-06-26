import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { normalizePostId } from '../postId';
import type { AccountPollingState, OutboxEvent, XPollingState } from './types';

const STATE_VERSION = 1;

function emptyState(): XPollingState {
  return {
    version: STATE_VERSION,
    accounts: {},
    outbox: [],
    checkedAt: null
  };
}

function normalizeAccountState(key: string, raw: unknown): AccountPollingState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Partial<AccountPollingState>;
  const username = String(value.username ?? key)
    .replace(/^@+/, '')
    .toLowerCase();
  if (!username) return undefined;

  return {
    userId: value.userId ? String(value.userId) : undefined,
    username,
    lastPostId: normalizePostId(value.lastPostId) || null,
    newestPostId: normalizePostId(value.newestPostId) || null,
    checkedAt: value.checkedAt ?? new Date(0).toISOString(),
    lastSuccessAt: value.lastSuccessAt,
    lastError: value.lastError
  };
}

function normalizeOutbox(raw: unknown): OutboxEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: OutboxEvent[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as OutboxEvent;
    const postId = normalizePostId(candidate.event?.post?.id);
    const username = candidate.event?.account?.username?.toLowerCase();
    if (!postId || !username) continue;

    const event: OutboxEvent = {
      event: {
        ...candidate.event,
        eventId: `x:${username}:${postId}`,
        post: {
          ...candidate.event.post,
          id: postId,
          url: `https://x.com/i/web/status/${postId}`
        }
      },
      createdAt: candidate.createdAt ?? new Date().toISOString(),
      attempts: Number.isInteger(candidate.attempts) ? candidate.attempts : 0,
      lastError: candidate.lastError
    };

    if (!seen.has(event.event.eventId)) {
      seen.add(event.event.eventId);
      events.push(event);
    }
  }

  return events;
}

export class JsonPollingStateStore {
  constructor(private readonly stateFile: string) {}

  async load(): Promise<XPollingState> {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(this.stateFile, 'utf8'));
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT') return emptyState();
      throw error;
    }

    const state = emptyState();
    const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const accounts =
      record.accounts && typeof record.accounts === 'object'
        ? (record.accounts as Record<string, unknown>)
        : {};

    for (const [key, value] of Object.entries(accounts)) {
      const account = normalizeAccountState(key, value);
      if (account) state.accounts[account.username] = account;
    }

    state.outbox = normalizeOutbox(record.outbox);
    state.checkedAt = typeof record.checkedAt === 'string' ? record.checkedAt : null;
    return state;
  }

  async save(state: XPollingState): Promise<void> {
    const dir = dirname(this.stateFile);
    await mkdir(dir, { recursive: true });
    const tmp = `${this.stateFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify({ ...state, version: STATE_VERSION }, null, 2), 'utf8');
    await rename(tmp, this.stateFile);
  }
}
