import { describe, expect, it } from 'vitest';
import { ToolConfigSchema, ToolDetailSchema } from '../../../lib/validates/tool';

const versionList = [
  {
    value: '1.0.0',
    inputs: [],
    outputs: []
  }
];

describe('tool runtime capability metadata', () => {
  it('keeps existing tool configs valid without runtime metadata', () => {
    const parsed = ToolConfigSchema.parse({
      name: { en: 'Legacy tool', 'zh-CN': '原有工具' },
      description: { en: 'Existing one-shot tool' },
      versionList
    });

    expect(parsed.runtime).toBeUndefined();
  });

  it('accepts execute runtime metadata as an optional capability label', () => {
    const parsed = ToolConfigSchema.parse({
      name: { en: 'Send message' },
      description: { en: 'Send a message to an external service' },
      versionList,
      runtime: {
        kind: 'execute',
        execute: {
          riskLevel: 'write',
          requireUserConfirmDefault: true,
          idempotencyKeyInput: 'requestId'
        }
      }
    });

    expect(parsed.runtime?.kind).toBe('execute');
    expect(parsed.runtime?.execute?.riskLevel).toBe('write');
  });

  it('accepts trigger runtime metadata for polling monitors', () => {
    const parsed = ToolConfigSchema.parse({
      name: { en: 'Check X watch' },
      description: { en: 'Check X account updates' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'polling',
          minIntervalSeconds: 60,
          defaultIntervalSeconds: 300,
          outputEventKey: 'events_json',
          outputStateKey: 'next_state_json'
        }
      }
    });

    expect(parsed.runtime?.kind).toBe('trigger');
    expect(parsed.runtime?.trigger?.type).toBe('polling');
  });

  it('accepts a structured trigger runtime contract', () => {
    const parsed = ToolConfigSchema.parse({
      name: { en: 'Watch X account' },
      description: { en: 'Watch account updates with state and event contracts' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'polling',
          schedule: {
            minIntervalSeconds: 60,
            defaultIntervalSeconds: 300,
            maxIntervalSeconds: 3600,
            timeoutSeconds: 60,
            jitterSeconds: 15
          },
          state: {
            inputKey: 'state_json',
            outputKey: 'next_state_json',
            schemaVersion: 'x-watch-state.v1',
            cursorKey: 'lastPostId',
            resettable: true
          },
          event: {
            outputKey: 'events_json',
            schemaVersion: 'x-watch-event.v1',
            dedupeKey: 'dedupeKey',
            occurredAtKey: 'postedAt',
            payloadKey: 'payload',
            maxBatchEvents: 50
          },
          delivery: {
            retryMaxAttempts: 3,
            retryBackoff: 'exponential',
            failurePolicy: 'keep_state',
            concurrencyKeyInput: 'watchId',
            lockTtlSeconds: 120
          },
          permissions: {
            allowManualRun: true,
            allowAutoRun: true
          },
          metadata: {
            source: 'x'
          }
        }
      }
    });

    expect(parsed.runtime?.trigger?.schedule?.defaultIntervalSeconds).toBe(300);
    expect(parsed.runtime?.trigger?.state?.outputKey).toBe('next_state_json');
    expect(parsed.runtime?.trigger?.event?.dedupeKey).toBe('dedupeKey');
    expect(parsed.runtime?.trigger?.delivery?.failurePolicy).toBe('keep_state');
  });

  it('accepts webhook trigger runtime metadata', () => {
    const parsed = ToolConfigSchema.parse({
      name: { en: 'Receive platform webhook' },
      description: { en: 'Receive external events and convert them to workflow events' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'webhook',
          webhook: {
            method: 'POST',
            path: '/webhooks/x',
            auth: 'signature',
            secretInputKey: 'webhookSecret',
            signatureHeader: 'X-Signature',
            timestampHeader: 'X-Timestamp',
            toleranceSeconds: 300
          },
          event: {
            outputKey: 'events_json',
            dedupeKey: 'eventId'
          }
        }
      }
    });

    expect(parsed.runtime?.trigger?.type).toBe('webhook');
    expect(parsed.runtime?.trigger?.webhook?.auth).toBe('signature');
  });

  it('rejects trigger runtime declarations without trigger config', () => {
    const parsed = ToolConfigSchema.safeParse({
      name: { en: 'Invalid trigger' },
      description: { en: 'Missing trigger config' },
      versionList,
      runtime: {
        kind: 'trigger'
      }
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid flat trigger interval metadata', () => {
    const parsed = ToolConfigSchema.safeParse({
      name: { en: 'Invalid trigger interval' },
      description: { en: 'Default interval is below min interval' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'polling',
          minIntervalSeconds: 300,
          defaultIntervalSeconds: 60
        }
      }
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid structured trigger schedule metadata', () => {
    const parsed = ToolConfigSchema.safeParse({
      name: { en: 'Invalid trigger schedule' },
      description: { en: 'Default interval is above max interval' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'polling',
          schedule: {
            defaultIntervalSeconds: 7200,
            maxIntervalSeconds: 3600
          }
        }
      }
    });

    expect(parsed.success).toBe(false);
  });

  it('exposes runtime metadata in tool detail responses when present', () => {
    const parsed = ToolDetailSchema.parse({
      toolId: 'xPlatform/checkWatch',
      icon: 'https://example.com/logo.svg',
      name: { en: 'Check X watch' },
      description: { en: 'Check X account updates' },
      versionList,
      runtime: {
        kind: 'trigger',
        trigger: {
          type: 'polling',
          state: {
            outputKey: 'next_state_json'
          },
          event: {
            outputKey: 'events_json',
            dedupeKey: 'dedupeKey'
          }
        }
      }
    });

    expect(parsed.runtime?.kind).toBe('trigger');
    expect(parsed.runtime?.trigger?.event?.outputKey).toBe('events_json');
  });
});
