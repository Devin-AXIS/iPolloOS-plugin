import { describe, expect, it, vi } from 'vitest';

vi.mock('@tool/utils/uploadFile', () => ({
  uploadFile: vi.fn(async () => ({
    accessUrl: 'https://os.ipollo.net/html-anything-test.html',
    objectName: 'html-anything-test.html',
    size: 128
  }))
}));

describe('html_anything_page tool', () => {
  it('publishes LangGraph-generated HTML without ai_app_key', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'saas-landing',
      content:
        '<!DOCTYPE html><html><head><title>Test</title></head><body><main><h1>Test</h1></main></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.template_id).toBe('saas-landing');
    expect(result.full_html).toContain('<html>');
    expect(result.full_html).toContain('Test');
    expect(result.summary).toContain('LangGraph');
  });

  it('asks LangGraph to regenerate when content is not complete HTML', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'auto',
      content: '请帮我做一个网站',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('complete HTML');
    expect(result.page_url).toBe('');
  });
});
