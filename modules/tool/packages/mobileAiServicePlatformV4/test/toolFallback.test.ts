import { afterEach, describe, expect, it, vi } from 'vitest';
import { tool } from '../children/mobile_ai_html_app/src';

describe('tool fallback behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns fallback html when the AI app returns empty content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            responseData: [],
            choices: [{ message: { role: 'assistant', content: '' }, finish_reason: 'stop' }]
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );

    const result = await tool({
      ai_app_key: 'test-key',
      ai_app_url: 'http://example.com/api',
      user_requirement: 'AI 日历',
      service_language: 'zh-CN',
      background: '个人效率管理',
      visual_prompt: '移动端',
      interaction_mode: 'auto',
      available_capabilities: '',
      page_output_mode: 'auto_publish'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('<!DOCTYPE html>');
    expect(result.page_html).toContain('V5_RUNTIME_BRIDGE');
    expect(result.page_html).toContain('window.iPolloOSAI');
    expect(result.full_html).toBe(result.page_html);
    expect(result.summary).toContain('V5_RUNTIME_BRIDGE');
    expect(result.interactive_html).toBe(true);
  });
});
