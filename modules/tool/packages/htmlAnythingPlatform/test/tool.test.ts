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
    expect(result.page_html).toContain('<html>');
    expect(result.page_html).toContain('Test');
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
    expect(result.page_html).toContain('html-anything-publication-toc-script');
    expect(result.page_html).toContain('html-anything-pdf-export-script');
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
    expect(result.page_html).toContain('html-anything-publication-toc-script');
  });

  it('rejects mixed slide template with non-slide long page html', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'ppt-keynote',
      content:
        '<!DOCTYPE html><html><head><title>Report</title></head><body><main class="magazine-feature"><h1>AI Report</h1><section><h2>趋势</h2><p>长篇报告内容</p></section></main></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('不同交付类别不能混用');
    expect(result.system_error).toContain('ppt-keynote');
    expect(result.system_error).toContain('research-report');
    expect(result.page_url).toBe('');
    expect(result.page_html).toBe('');
  });

  it('rejects publication templates that contain fixed poster html', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'academic-paper',
      content:
        '<!DOCTYPE html><html><head><style>html,body{margin:0;height:100%;overflow:hidden}.viewport{height:100vh;overflow:hidden}.poster{aspect-ratio:16/9}</style></head><body><div class="viewport"><section class="poster"><h1>AI Brief</h1><p>No Scroll</p></section></div></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('模板类别是出版物');
    expect(result.system_error).toContain('不能生成固定 16:9 海报');
    expect(result.page_url).toBe('');
    expect(result.page_html).toBe('');
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

  it('rejects video templates because video creation belongs to HyperFrames', async () => {
    const { tool } = await import('../children/html_anything_page/src');
    const result = await tool({
      template_id: 'video-hyperframes',
      content:
        '<!DOCTYPE html><html><head><title>Video</title></head><body><main>Video</main></body></html>',
      page_output_mode: 'raw_html'
    });

    expect(result.system_error).toContain('未知的 html-anything template_id');
    expect(result.page_url).toBe('');
  });
});
