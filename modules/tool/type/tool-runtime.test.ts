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
          type: 'polling'
        }
      }
    });

    expect(parsed.runtime?.kind).toBe('trigger');
  });
});
