import { describe, expect, it, vi } from 'vitest';
import config from '../children/send_ipollo_push/config';
import { tool } from '../children/send_ipollo_push/src';

const emptyXapiUpdate = {
  event_id: 'test-event',
  push_policy: 'skip_empty_allowed_updates',
  source_tool: 'xPlatform_xapito/checkAccountUpdates',
  count: 0
};

describe('ipollo push empty update policy', () => {
  it('declares empty update policy inputs and skipped outputs', () => {
    const latestVersion = config.versionList[0];

    expect(latestVersion.inputs.map((input) => input.key)).toEqual(
      expect.arrayContaining(['push_policy', 'source_tool', 'count', 'system_error'])
    );
    expect(latestVersion.outputs.map((output) => output.key)).toEqual(
      expect.arrayContaining(['skipped', 'skip_reason'])
    );
  });

  it('skips empty updates from allowlisted source tools before requiring text', async () => {
    const result = await tool(emptyXapiUpdate);

    expect(result).toMatchObject({
      ok: true,
      status_code: 'skipped',
      event_id: 'test-event',
      matched_user_count: 0,
      delivered_count: 0,
      skipped_count: 1,
      response_text: '',
      skipped: true,
      skip_reason: 'empty_update_for_allowed_source'
    });
  });

  it('does not skip when the upstream monitor reports an error', async () => {
    const result = await tool({
      ...emptyXapiUpdate,
      system_error: { code: 'X_API_ERROR', message: 'failed' }
    });

    expect(result.ok).toBe(false);
    expect(result.skipped).toBeUndefined();
    expect(result.skip_reason).toBeUndefined();
  });

  it('uses upstream system errors as fallback push text', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));

      expect(body.text).toBe(JSON.stringify({ code: 'X_API_ERROR', message: 'failed' }));
      return new Response('ok', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await tool({
      ...emptyXapiUpdate,
      hook_url: 'https://example.test/hook',
      system_error: { code: 'X_API_ERROR', message: 'failed' }
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('does not skip sources outside the allowlist', async () => {
    const result = await tool({
      ...emptyXapiUpdate,
      source_tool: 'enemyPlatform/checkUpdates'
    });

    expect(result.ok).toBe(false);
    expect(result.skipped).toBeUndefined();
    expect(result.skip_reason).toBeUndefined();
  });
});
