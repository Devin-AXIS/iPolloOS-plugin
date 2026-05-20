import { describe, expect, test } from 'bun:test';
import { formatDailyMarkdown, formatDailiesMarkdown, formatItemsMarkdown } from '../lib/format';

describe('AI HOT formatters', () => {
  test('formats item markdown with source url', () => {
    const markdown = formatItemsMarkdown({
      count: 1,
      hasNext: false,
      items: [
        {
          title: 'OpenAI 发布新模型',
          url: 'https://example.com/openai',
          source: 'Example',
          publishedAt: '2026-05-19T00:00:00.000Z',
          summary: '模型能力更新。',
          category: 'models'
        }
      ]
    });

    expect(markdown).toContain('OpenAI 发布新模型');
    expect(markdown).toContain('模型能力更新。');
    expect(markdown).toContain('https://example.com/openai');
  });

  test('formats daily sections', () => {
    const markdown = formatDailyMarkdown({
      date: '2026-05-19',
      generatedAt: '2026-05-19T00:00:00.000Z',
      sections: [
        {
          label: '产品发布/更新',
          items: [
            {
              title: '新产品上线',
              summary: '产品摘要。',
              sourceUrl: 'https://example.com/product',
              sourceName: 'Example'
            }
          ]
        }
      ],
      flashes: []
    });

    expect(markdown).toContain('AI HOT 日报 2026-05-19');
    expect(markdown).toContain('产品发布/更新');
    expect(markdown).toContain('新产品上线');
  });

  test('formats available daily dates', () => {
    const markdown = formatDailiesMarkdown({
      count: 1,
      items: [
        {
          date: '2026-05-19',
          generatedAt: '2026-05-19T00:00:00.000Z',
          leadTitle: '头条',
          leadParagraph: null
        }
      ]
    });

    expect(markdown).toContain('2026-05-19');
    expect(markdown).toContain('头条');
  });
});
