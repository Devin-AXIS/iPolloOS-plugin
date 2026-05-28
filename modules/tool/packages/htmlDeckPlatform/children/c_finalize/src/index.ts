import { z } from 'zod';
import { parseDeckState } from '../../../lib/state';
import { buildSingleFileHtml } from '../../../lib/buildHtml';
import { collectDeckImageRequests } from '../../../lib/imageRequests';

export const InputType = z.object({
  deck_state: z.string(),
  embed_mermaid: z.coerce.boolean(),
  page_output_mode: z
    .enum(['auto_publish', 'raw_html', 'resource_center'])
    .optional()
    .default('auto_publish')
});

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  html_document: z.string(),
  full_html: z.string(),
  slide_count: z.number(),
  summary: z.string(),
  image_requests_json: z.string(),
  pending_image_count: z.number(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const inp = InputType.parse(props);
    const state = parseDeckState(inp.deck_state);
    if (state.slides.length === 0) {
      return {
        page_html: '',
        page_url: '',
        html_document: '',
        full_html: '',
        slide_count: 0,
        summary: '',
        image_requests_json: '[]',
        pending_image_count: 0,
        system_error: '没有幻灯片页，请先 deck_add_slide。'
      };
    }
    const html_document = buildSingleFileHtml(state, { embedMermaid: inp.embed_mermaid });
    const n = state.slides.length;
    const imageRequests = collectDeckImageRequests(state);
    return {
      page_html: html_document,
      page_url: '',
      html_document,
      full_html: html_document,
      slide_count: n,
      image_requests_json: JSON.stringify(imageRequests),
      pending_image_count: imageRequests.length,
      summary: `已生成最终幻灯片页面：${n} 页单文件 HTML（约 ${html_document.length} 字符）。${imageRequests.length ? `仍有 ${imageRequests.length} 个待生成配图，请先生成图片并回填 image_url。` : ''}这是最终 deliverable 的 page_html；自动发布后请向用户提供本工具产生的 page_url，不要把图表工具的 chart page_url 当作最终链接。`
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      page_html: '',
      page_url: '',
      html_document: '',
      full_html: '',
      slide_count: 0,
      summary: '',
      image_requests_json: '[]',
      pending_image_count: 0,
      system_error: msg
    };
  }
}
