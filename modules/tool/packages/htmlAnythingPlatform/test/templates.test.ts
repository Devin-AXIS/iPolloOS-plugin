import { describe, expect, it } from 'vitest';
import { HTML_ANYTHING_TEMPLATES, getHtmlAnythingTemplate } from '../lib/templates';
import { buildGeneratePrompt } from '../lib/prompt';

describe('html-anything templates', () => {
  it('bundles all current upstream templates', () => {
    expect(HTML_ANYTHING_TEMPLATES.length).toBe(75);
    expect(getHtmlAnythingTemplate('deck-swiss-international')?.zhName).toContain('瑞士');
    expect(getHtmlAnythingTemplate('video-hyperframes')?.category).toBe('video');
  });

  it('builds prompt with selected template body', () => {
    const template = getHtmlAnythingTemplate('saas-landing');
    expect(template).toBeTruthy();
    const prompt = buildGeneratePrompt({
      template: template!,
      content: '# 产品\n用于团队协作。',
      format: 'markdown',
      language: 'zh-CN'
    });
    expect(prompt).toContain('saas-landing');
    expect(prompt).toContain('用于团队协作');
    expect(prompt).toContain(template!.body.slice(0, 40));
  });
});
