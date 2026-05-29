import { describe, expect, it } from 'vitest';
import { tool } from '../children/mobile_ai_html_app/src';

describe('mobile AI service HTML app tool', () => {
  it('accepts upstream AI generated html without ai_app_key', async () => {
    const result = await tool({
      user_requirement: 'AI 日历',
      generated_html:
        '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>AI 日历</title></head><body><main>AI 日历</main></body></html>',
      service_language: 'zh-CN',
      background: '个人效率管理',
      visual_prompt: '移动端',
      interaction_mode: 'auto',
      available_capabilities: '',
      page_output_mode: 'auto_publish'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.page_html).toContain('<!DOCTYPE html>');
    expect(result.page_html).toContain('window.iPolloOSAI');
    expect(result.full_html).toBe(result.page_html);
    expect(result.summary).toContain('上游 AI 大脑');
    expect(result.interactive_html).toBe(true);
  });
});
