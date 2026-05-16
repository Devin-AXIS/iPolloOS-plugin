import { getErrText } from '@tool/utils/err';
import { z } from 'zod';
import { ArkAuthFields, resolveVideoModelId } from '../../../lib/arkAuth';
import { normalizeArkBaseUrl } from '../../../lib/parseChatCompletion';
import { buildVideoGenerationTaskBody } from '../../../lib/videoTaskPayload';
import type { AspectChoice, DurationMode, ResolutionChoice } from '../../../lib/buildVideoPrompt';
import type { VideoGenMode } from '../../../lib/videoTaskPayload';

const empty = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v);

const aspectEnum = z.enum(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', '智能']);
const resEnum = z.enum(['480p', '720p', '1080p']);
const durModeEnum = z.enum(['seconds', 'smart']);
const modeEnum = z.enum(['text', 'reference', 'frames']);

export const InputType = ArkAuthFields.and(
  z.object({
    creative_prompt: z.string().min(1).max(50_000),
    generation_mode: modeEnum,
    reference_image_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    first_frame_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    last_frame_url: z.preprocess(empty, z.string().max(4096).optional()).default(''),
    aspect_ratio: aspectEnum,
    resolution: resEnum,
    duration_mode: durModeEnum,
    duration_seconds: z.preprocess((v) => {
      if (v === '' || v === null || v === undefined) return 5;
      const n = Number(v);
      return Number.isFinite(n) ? n : 5;
    }, z.number().min(1).max(120))
  })
);

export const OutputType = z.object({
  task_id: z.string(),
  task_response_json: z.string(),
  system_error: z.string().optional()
});

type In = z.infer<typeof InputType>;
type Out = z.infer<typeof OutputType>;

export async function tool(raw: In): Promise<Out> {
  try {
    const inp = InputType.parse(raw);
    const mode = inp.generation_mode as VideoGenMode;

    if (mode === 'reference' && !inp.reference_image_url?.trim()) {
      return {
        task_id: '',
        task_response_json: '{}',
        system_error: '「参考生成」模式需要填写参考图地址'
      };
    }
    if (mode === 'frames') {
      if (!inp.first_frame_url?.trim() || !inp.last_frame_url?.trim()) {
        return {
          task_id: '',
          task_response_json: '{}',
          system_error: '「首尾帧」模式需要同时填写首帧图地址与尾帧图地址'
        };
      }
    }

    const model = resolveVideoModelId(inp);
    const base = normalizeArkBaseUrl(inp.ark_base_url ?? '');
    const url = `${base}/contents/generations/tasks`;

    const body = buildVideoGenerationTaskBody({
      model,
      prompt: inp.creative_prompt,
      mode,
      aspect: inp.aspect_ratio as AspectChoice,
      resolution: inp.resolution as ResolutionChoice,
      duration_mode: inp.duration_mode as DurationMode,
      duration_seconds: inp.duration_seconds,
      reference_image_url: inp.reference_image_url,
      first_frame_url: inp.first_frame_url,
      last_frame_url: inp.last_frame_url
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${inp.ark_api_key.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    const rawJson = JSON.stringify(data ?? { raw: text.slice(0, 8000) });

    if (!res.ok) {
      return {
        task_id: '',
        task_response_json: rawJson,
        system_error: `HTTP ${res.status}: ${text.slice(0, 2000)}`
      };
    }

    let taskId = '';
    if (data && typeof data === 'object') {
      const id = (data as Record<string, unknown>).id;
      if (typeof id === 'string') taskId = id;
    }

    return {
      task_id: taskId,
      task_response_json: rawJson
    };
  } catch (e: unknown) {
    return {
      task_id: '',
      task_response_json: '{}',
      system_error: getErrText(e)
    };
  }
}
