import { describe, expect, it, vi } from 'vitest';

vi.mock('@tool/utils/uploadFile', () => ({
  uploadFile: vi.fn(async () => ({
    accessUrl: 'https://os.ipollo.net/html-anything-test.html',
    objectName: 'html-anything-test.html',
    size: 128
  }))
}));

describe('html_anything_page tool', () => {
  it('publishes upstream-AI-generated HTML without ai_app_key', async () => {
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
    expect(result.summary).toContain('上游 AI 大脑');
  });

  it('keeps publication reader toc mechanism when upstream html omits it', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'book-editorial',
      content:
        '<!DOCTYPE html><html><head><title>Book</title></head><body><article><h1>第一章</h1><h2>方法</h2><h2>结论</h2></article></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.template_id).toBe('book-editorial');
    expect(result.full_html).toContain('html-anything-publication-toc-script');
    expect(result.full_html).toContain('html-anything-pdf-export-script');
  });

  it('auto-detects publication template from generated html before injecting runtimes', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'auto',
      content:
        '<!DOCTYPE html><html><head><title>Book</title></head><body><article class="book-shell"><h1>第一章</h1><h2>方法</h2><h2>结论</h2></article></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.template_id).toBe('book-editorial');
    expect(result.full_html).toContain('html-anything-publication-toc-script');
  });

  it('asks upstream AI brain to regenerate when content is not complete HTML', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'auto',
      content: '请帮我做一个网站',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('完整 HTML');
    expect(result.page_url).toBe('');
  });
});
