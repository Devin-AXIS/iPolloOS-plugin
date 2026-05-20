import { HTML_ANYTHING_TEMPLATES, type HtmlAnythingTemplate } from './templates.generated';

export { HTML_ANYTHING_TEMPLATES, type HtmlAnythingTemplate };

export const AUTO_TEMPLATE_ID = 'auto';

export function getHtmlAnythingTemplate(id: string): HtmlAnythingTemplate | undefined {
  return HTML_ANYTHING_TEMPLATES.find((item) => item.id === id);
}

export function hasHtmlAnythingTemplate(id: string): boolean {
  return id === AUTO_TEMPLATE_ID || Boolean(getHtmlAnythingTemplate(id));
}

export function listTemplateOptions(): Array<{
  label: string;
  value: string;
  description?: string;
  alias?: string;
  category?: string;
  scenario?: string;
  tags?: string[];
}> {
  return [
    {
      label: 'AI 自动选择',
      value: AUTO_TEMPLATE_ID,
      description: '根据内容、格式和额外要求自动选择最合适的 html-anything 模板。',
      alias: 'AI 自动选择'
    },
    ...HTML_ANYTHING_TEMPLATES.map((item) => ({
      label: `${item.zhName} / ${item.enName}`,
      value: item.id,
      description: `${item.description}；适配：${item.aspectHint}`,
      alias: `${item.zhName} (${item.id})`,
      category: item.category,
      scenario: item.scenario,
      tags: item.tags
    }))
  ];
}

export function buildTemplateSelectionCatalog(): string {
  return HTML_ANYTHING_TEMPLATES.map((item) =>
    [
      `- id: ${item.id}`,
      `  name: ${item.zhName} / ${item.enName}`,
      `  category: ${item.category}`,
      `  scenario: ${item.scenario}`,
      `  aspect: ${item.aspectHint}`,
      `  description: ${item.description}`,
      `  tags: ${item.tags.join(', ')}`
    ].join('\n')
  ).join('\n');
}
