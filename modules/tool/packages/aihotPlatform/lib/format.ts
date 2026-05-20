import type { AihotItem, DailyResponse, DailiesResponse, ItemsResponse } from './schemas';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstLine(value: unknown): string {
  return cleanText(value).replace(/\s+/g, ' ');
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatSourceLinksFromItems(items: AihotItem[]): string {
  return items
    .map((item, index) => {
      const title = firstLine(item.title) || firstLine(item.title_en) || `条目 ${index + 1}`;
      const url = cleanText(item.url);
      return url ? `${index + 1}. ${title} - ${url}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

export function formatItemsMarkdown(data: ItemsResponse): string {
  if (!data.items.length) {
    return '未查询到 AI HOT 动态。';
  }

  const lines = [
    `# AI HOT 动态`,
    '',
    `共返回 ${data.items.length} 条${data.hasNext ? '，还有更多结果' : ''}。摘要由 AI HOT 生成，重要信息请以原文链接为准。`
  ];

  data.items.forEach((item, index) => {
    const title = firstLine(item.title) || firstLine(item.title_en) || `未命名动态 ${index + 1}`;
    const source = firstLine(item.source);
    const publishedAt = firstLine(item.publishedAt);
    const category = firstLine(item.category);
    const meta = [source, category, publishedAt].filter(Boolean).join(' · ');

    lines.push('', `## ${index + 1}. ${title}`);
    if (meta) lines.push(meta);
    const summary = cleanText(item.summary);
    if (summary) lines.push('', summary);
    const url = cleanText(item.url);
    if (url) lines.push('', `原文：${url}`);
  });

  return lines.join('\n');
}

export function formatDailyMarkdown(data: DailyResponse): string {
  const date = firstLine(data.date) || '最近一期';
  const lines = [`# AI HOT 日报 ${date}`, '', '摘要由 AI HOT 生成，重要信息请以原文链接为准。'];

  if (!data.sections.length) {
    lines.push('', '未查询到日报内容。');
    return lines.join('\n');
  }

  data.sections.forEach((section) => {
    const label = firstLine(section.label) || '未分类';
    lines.push('', `## ${label}`);

    if (!section.items.length) {
      lines.push('', '暂无条目。');
      return;
    }

    section.items.forEach((item, index) => {
      const title = firstLine(item.title) || `条目 ${index + 1}`;
      const source = firstLine(item.sourceName);
      lines.push('', `### ${index + 1}. ${title}`);
      if (source) lines.push(source);
      const summary = cleanText(item.summary);
      if (summary) lines.push('', summary);
      const sourceUrl = cleanText(item.sourceUrl);
      if (sourceUrl) lines.push('', `原文：${sourceUrl}`);
    });
  });

  return lines.join('\n');
}

export function formatDailySourceLinks(data: DailyResponse): string {
  const links: string[] = [];
  data.sections.forEach((section) => {
    section.items.forEach((item) => {
      const title = firstLine(item.title) || '未命名条目';
      const url = cleanText(item.sourceUrl);
      if (url) links.push(`${links.length + 1}. ${title} - ${url}`);
    });
  });
  return links.join('\n');
}

export function formatDailiesMarkdown(data: DailiesResponse): string {
  if (!data.items.length) {
    return '未查询到 AI HOT 日报日期。';
  }

  const lines = ['# AI HOT 可用日报日期', '', `共返回 ${data.items.length} 期。`];
  data.items.forEach((item, index) => {
    const lead = firstLine(item.leadTitle);
    const generatedAt = firstLine(item.generatedAt);
    lines.push(
      '',
      `${index + 1}. ${item.date}${lead ? ` - ${lead}` : ''}${generatedAt ? ` (${generatedAt})` : ''}`
    );
  });
  return lines.join('\n');
}
