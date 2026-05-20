import { describe, expect, it } from 'vitest';
import { buildFallbackMobileAppHtml } from '../lib/fallback';

describe('fallback page', () => {
  it('builds a complete functional mobile html page', () => {
    const html = buildFallbackMobileAppHtml({
      userRequirement: 'AI 日历',
      serviceLanguage: 'zh-CN',
      background: '个人效率管理',
      visualPrompt: '磨砂感',
      interactionMode: 'auto',
      upstreamError: 'AI app error: Agent 大脑: 403 Your request was blocked.'
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('AI 日历');
    expect(html).toContain('403 Your request was blocked');
    expect(html).toContain('生成方案');
  });
});
