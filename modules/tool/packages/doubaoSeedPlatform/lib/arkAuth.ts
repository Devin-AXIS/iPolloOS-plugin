import { z } from 'zod';

/** 与 plugins 资源配置 secretInputConfig.key 一致，运行时会合并进工具入参 */
export const ArkAuthFields = z.object({
  ark_api_key: z.string().min(8).max(4096),
  ark_base_url: z.preprocess((v) => {
    const s = typeof v === 'string' ? v.trim() : '';
    return s || 'https://ark.cn-beijing.volces.com/api/v3';
  }, z.string().url().max(2048)),
  /** 对话用推理接入点 / 模型 ID */
  chat_model_ep: z.string().min(1).max(512),
  /** 视频用接入点；留空则在工具内回退为 chat_model_ep */
  video_model_ep: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? '' : String(v).trim()),
    z.string().max(512)
  )
});

export type ArkAuthIn = z.infer<typeof ArkAuthFields>;

export function resolveVideoModelId(inp: ArkAuthIn): string {
  const v = inp.video_model_ep?.trim();
  return v || inp.chat_model_ep.trim();
}
