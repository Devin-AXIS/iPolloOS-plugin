import { z } from 'zod';
import { AiAppFields, callAiApp } from '../../../lib/aiApp';
import { buildFallbackMobileAppHtml } from '../../../lib/fallback';
import { buildCoverJson, extractHtml } from '../../../lib/html';
import { DEFAULT_CAPABILITIES, buildMobileAiServicePrompt } from '../../../lib/prompt';
import { injectRuntimeBridge } from '../../../lib/runtimeBridge';

const empty = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const ServiceLanguageSchema = z.enum(['zh-CN', 'en', 'ja', 'zh-en', 'auto']);
const InteractionModeSchema = z.enum(['auto', 'creator', 'assessment', 'game', 'video', 'form']);

const normalizeServiceLanguage = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  const normalized = text.toLowerCase().replace(/_/g, '-');
  if (!text || text === '中文' || normalized === 'zh' || normalized === 'zh-cn') return 'zh-CN';
  if (text === '英文' || normalized === 'en' || normalized === 'english') return 'en';
  if (text === '日文' || text === '日本語' || normalized === 'ja' || normalized === 'jp')
    return 'ja';
  if (text === '中英双语' || normalized === 'zh-en' || normalized === 'cn-en') return 'zh-en';
  if (text === '跟随用户' || normalized === 'auto') return 'auto';
  return value;
};

export const InputType = AiAppFields.and(
  z.object({
    user_requirement: z.string().min(1).max(100_000),
    service_language: z
      .preprocess(normalizeServiceLanguage, ServiceLanguageSchema)
      .default('zh-CN'),
    background: z.string().min(1).max(100_000),
    visual_prompt: z
      .preprocess(empty, z.string().max(50_000).optional())
      .default(
        '移动端优先；可参考朦胧、磨砂、弥散渐变、轻微景深等质感；最终风格由 AI 根据应用目标自行取舍。'
      ),
    interaction_mode: InteractionModeSchema.default('auto'),
    available_capabilities: z
      .preprocess(empty, z.string().max(50_000).optional())
      .default(DEFAULT_CAPABILITIES),
    page_output_mode: z.enum(['auto_publish', 'raw_html']).optional().default('auto_publish')
  })
);

export const OutputType = z.object({
  page_html: z.string(),
  page_url: z.string(),
  page_cover: z.string(),
  full_html: z.string(),
  interactive_html: z.boolean(),
  interactive_title: z.string(),
  interactive_description: z.string(),
  summary: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(props: In): Promise<Out> {
  try {
    const input = InputType.parse(props);
    const prompt = buildMobileAiServicePrompt({
      userRequirement: input.user_requirement.trim(),
      serviceLanguage: input.service_language,
      background: input.background.trim(),
      visualPrompt: input.visual_prompt.trim(),
      interactionMode: input.interaction_mode,
      availableCapabilities: input.available_capabilities
    });

    const variables = {
      user_requirement: input.user_requirement.trim(),
      service_language: input.service_language,
      background: input.background.trim(),
      visual_prompt: input.visual_prompt.trim(),
      interaction_mode: input.interaction_mode,
      available_capabilities: input.available_capabilities
    };
    const generatedHtml = await (async () => {
      try {
        const raw = await callAiApp({
          auth: input,
          prompt,
          chatId: `mobile-ai-service-${Date.now()}`,
          variables
        });
        return extractHtml(raw);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        return buildFallbackMobileAppHtml({
          userRequirement: input.user_requirement.trim(),
          serviceLanguage: input.service_language,
          background: input.background.trim(),
          visualPrompt: input.visual_prompt.trim(),
          interactionMode: input.interaction_mode,
          upstreamError: reason
        });
      }
    })();
    const fullHtml = injectRuntimeBridge(generatedHtml);
    const title = input.user_requirement.trim().split(/\n/)[0] || '移动端 AI 服务';

    return {
      page_html: fullHtml,
      page_url: '',
      page_cover: buildCoverJson({
        title,
        description: `已按背景「${input.background.trim().slice(0, 72)}」生成移动端 AI 服务。`,
        mode: input.interaction_mode,
        language: input.service_language
      }),
      full_html: fullHtml,
      interactive_html: true,
      interactive_title: title,
      interactive_description:
        '移动端 AI 应用运行时；页面内 AI、搜索、语音、图像、视频和数据库动作会通过 iPolloOS Runtime 调用。',
      summary:
        'V5_RUNTIME_BRIDGE：已生成移动端 AI 服务 HTML，并注入 iPolloOS Runtime 调用桥；资源配置中的运行时 AI 应用 Key/地址将用于页面发布后的真实 AI、搜索、语音、图像、视频和数据库动作。'
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      page_html: '',
      page_url: '',
      page_cover: '',
      full_html: '',
      interactive_html: false,
      interactive_title: '',
      interactive_description: '',
      summary: '',
      system_error: message
    };
  }
}
