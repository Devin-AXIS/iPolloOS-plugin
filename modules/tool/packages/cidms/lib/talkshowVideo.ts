import { cidmsJsonRequest, safeJson } from './client';
import type { CidmsAuth } from './schemas';
import { assetModelForType, clean, removeUndefined, type VideoContentPart } from './video';

export type TalkshowOrientation = 'vertical' | 'horizontal';
export type TalkshowDuration = 15 | 30;

export type TalkshowToolInput = CidmsAuth & {
  description: string;
  dialogue?: string;
  duration: TalkshowDuration;
  orientation: TalkshowOrientation;
  character_reference_url?: string;
  background_reference_url?: string;
  resolution?: string;
  generate_audio?: boolean;
  callback_url?: string;
  client_reference_id?: string;
};

export type TalkshowToolOut = {
  task_id: string;
  status: string;
  progress: number;
  result_url: string;
  first_task_id: string;
  second_task_id: string;
  first_video_url: string;
  second_video_url: string;
  final_prompt: string;
  response_json: string;
  system_error?: string;
};

export type CidmsRequest = {
  auth: CidmsAuth;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
};

export type CidmsRequester = <T = Record<string, unknown>>(req: CidmsRequest) => Promise<T>;

export type TalkshowRunOptions = {
  pollIntervalMs?: number;
  maxPolls?: number;
};

type TalkshowPayloadInput = {
  description: string;
  dialogue?: string;
  orientation: TalkshowOrientation;
  characterReferenceUrl?: string;
  backgroundReferenceUrl?: string;
  continuationReferenceUrl?: string;
  prompt?: string;
  resolution?: string;
  generateAudio?: boolean;
  callbackUrl?: string;
  clientReferenceId?: string;
};

type VideoTaskData = {
  task_id: string;
  status: string;
  progress: number;
  result_url: string;
  raw: Record<string, unknown>;
};

const PUNCTUATION = '。！？!?；;，,、：:';
const FAILED_STATUSES = new Set(['failed', 'error', 'cancelled']);

export function mapTalkshowRatio(orientation: TalkshowOrientation): string {
  return orientation === 'vertical' ? '9:16' : '16:9';
}

export function splitTalkshowDialogue(dialogue?: string): { first: string; second: string } {
  const text = clean(dialogue);
  if (!text) return { first: '', second: '' };
  if (text.length <= 1) return { first: text, second: '' };

  const midpoint = Math.floor(text.length / 2);
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 1; i < text.length - 1; i += 1) {
    if (!PUNCTUATION.includes(text[i])) continue;
    const splitIndex = i + 1;
    const distance = Math.abs(splitIndex - midpoint);
    if (distance < bestDistance) {
      best = splitIndex;
      bestDistance = distance;
    }
  }

  const splitAt = best > 0 ? best : midpoint;
  return {
    first: text.slice(0, splitAt).trim(),
    second: text.slice(splitAt).trim()
  };
}

export function buildFirstPrompt(input: {
  description: string;
  dialogue?: string;
  orientation: TalkshowOrientation;
  hasCharacterReference?: boolean;
  hasBackgroundReference?: boolean;
}): string {
  const orientationText = input.orientation === 'vertical' ? '竖屏' : '横屏';
  const dialogue = clean(input.dialogue) || '围绕视频主题自然展开口播内容。';
  const characterRule = input.hasCharacterReference
    ? '若提供人物参考图，严格保持人物脸部、服装、发型一致；'
    : '';
  const backgroundRule = input.hasBackgroundReference
    ? '若提供背景参考图，保持背景环境、灯光、色调一致；'
    : '';

  return [
    `生成一段脱口秀/口播视频。视频主题：${input.description}。`,
    `人物台词：${dialogue}。`,
    '保持人物自然面对镜头，表情生动，语速稳定。',
    `画面为${orientationText}，适合短视频平台。`,
    `${characterRule}${backgroundRule}`.trim()
  ]
    .filter(Boolean)
    .join('');
}

export function buildContinuityPrompt(input: {
  description: string;
  dialogue?: string;
  orientation: TalkshowOrientation;
}): string {
  const continuation = clean(input.dialogue) || `继续围绕视频主题自然延展：${input.description}`;
  return [
    '这是上一段15秒视频的自然延续。',
    '保持同一个人物、同一服装、同一发型、同一背景、同一灯光、同一镜头角度、同一画面比例和同一脱口秀/口播风格。',
    '从上一段结尾状态继续，不要切换场景，不要更换人物，不要改变人物身份。',
    `主持人继续面对镜头说话，表情和肢体动作自然衔接。后15秒内容：${continuation}。`,
    '镜头要求：固定中近景，轻微自然手势，口播节奏稳定，背景不变。'
  ].join('');
}

export function buildTalkshowFirstPayload(input: TalkshowPayloadInput): Record<string, unknown> {
  const prompt =
    input.prompt ??
    buildFirstPrompt({
      description: input.description,
      dialogue: input.dialogue,
      orientation: input.orientation,
      hasCharacterReference: !!clean(input.characterReferenceUrl),
      hasBackgroundReference: !!clean(input.backgroundReferenceUrl)
    });

  return buildTalkshowPayload({
    ...input,
    prompt
  });
}

export function buildTalkshowPayload(input: TalkshowPayloadInput & { prompt: string }): Record<string, unknown> {
  const content: VideoContentPart[] = [{ type: 'text', text: input.prompt }];
  appendReference(content, input.characterReferenceUrl, 'reference_image');
  appendReference(content, input.backgroundReferenceUrl, 'reference_image');
  appendReference(content, input.continuationReferenceUrl, 'reference_video');

  return removeUndefined({
    model: 'seedance-2.0-asset',
    content,
    generate_audio: input.generateAudio,
    ratio: mapTalkshowRatio(input.orientation),
    resolution: clean(input.resolution) || '720p',
    duration: 15,
    callback_url: clean(input.callbackUrl),
    client_reference_id: clean(input.clientReferenceId)
  });
}

export async function runTalkshowVideoGeneration(
  input: TalkshowToolInput,
  request: CidmsRequester = cidmsJsonRequest,
  options: TalkshowRunOptions = {}
): Promise<TalkshowToolOut> {
  const resolvedReferences = await resolveReferenceAssets(input, request);
  const dialogue = splitTalkshowDialogue(input.dialogue);
  const firstDialogue = input.duration === 30 ? dialogue.first : clean(input.dialogue);
  const firstPrompt = buildFirstPrompt({
    description: input.description,
    dialogue: firstDialogue,
    orientation: input.orientation,
    hasCharacterReference: !!resolvedReferences.character,
    hasBackgroundReference: !!resolvedReferences.background
  });
  const firstPayload = buildTalkshowFirstPayload({
    description: input.description,
    dialogue: firstDialogue,
    orientation: input.orientation,
    characterReferenceUrl: resolvedReferences.character,
    backgroundReferenceUrl: resolvedReferences.background,
    prompt: firstPrompt,
    resolution: input.resolution,
    generateAudio: input.generate_audio,
    callbackUrl: input.callback_url,
    clientReferenceId: input.client_reference_id
  });

  const firstCreate = await createVideoTask(input, request, firstPayload);
  if (input.duration === 15) {
    return {
      task_id: firstCreate.task_id,
      status: firstCreate.status,
      progress: firstCreate.progress,
      result_url: firstCreate.result_url,
      first_task_id: firstCreate.task_id,
      second_task_id: '',
      first_video_url: firstCreate.result_url,
      second_video_url: '',
      final_prompt: firstPrompt,
      response_json: safeJson({ first: firstCreate.raw, final_prompt: firstPrompt })
    };
  }

  const firstDone = firstCreate.result_url
    ? firstCreate
    : await waitForVideoResult(input, request, firstCreate.task_id, options);
  const videoAssetRef = await uploadAsset(input, request, {
    assetType: 'Video',
    assetUrl: firstDone.result_url,
    assetName: 'talkshow-first-segment'
  });
  const continuityPrompt = buildContinuityPrompt({
    description: input.description,
    dialogue: dialogue.second,
    orientation: input.orientation
  });
  const secondPayload = buildTalkshowPayload({
    description: input.description,
    dialogue: dialogue.second,
    orientation: input.orientation,
    characterReferenceUrl: resolvedReferences.character,
    backgroundReferenceUrl: resolvedReferences.background,
    continuationReferenceUrl: videoAssetRef,
    prompt: continuityPrompt,
    resolution: input.resolution,
    generateAudio: input.generate_audio,
    callbackUrl: input.callback_url,
    clientReferenceId: input.client_reference_id
  });
  const secondCreate = await createVideoTask(input, request, secondPayload);

  return {
    task_id: secondCreate.task_id,
    status: secondCreate.status,
    progress: secondCreate.progress,
    result_url: '',
    first_task_id: firstCreate.task_id,
    second_task_id: secondCreate.task_id,
    first_video_url: firstDone.result_url,
    second_video_url: secondCreate.result_url,
    final_prompt: continuityPrompt,
    response_json: safeJson({
      needs_external_merge: true,
      merge_message: 'CIDMS 当前插件未配置视频拼接接口，返回两个 15s 片段供外部拼接。',
      first: firstDone.raw,
      second: secondCreate.raw,
      first_prompt: firstPrompt,
      second_prompt: continuityPrompt
    })
  };
}

async function resolveReferenceAssets(input: TalkshowToolInput, request: CidmsRequester) {
  return {
    character: await resolveReferenceAsset(input, request, input.character_reference_url, 'talkshow-character-reference'),
    background: await resolveReferenceAsset(input, request, input.background_reference_url, 'talkshow-background-reference')
  };
}

async function resolveReferenceAsset(
  auth: CidmsAuth,
  request: CidmsRequester,
  source: string | undefined,
  assetName: string
): Promise<string> {
  const ref = clean(source);
  if (!ref || ref.startsWith('asset://')) return ref;
  return uploadAsset(auth, request, { assetType: 'Image', assetUrl: ref, assetName });
}

async function uploadAsset(
  auth: CidmsAuth,
  request: CidmsRequester,
  input: { assetType: 'Image' | 'Video'; assetUrl: string; assetName: string }
): Promise<string> {
  const group = await request<Record<string, unknown>>({
    auth,
    method: 'POST',
    path: '/volc/asset/CreateAssetGroup',
    body: {
      model: 'volc-asset',
      Name: 'cidms-talkshow-video'
    }
  });
  const groupId = readString(group, 'Id');
  if (!groupId) throw new Error('CIDMS asset group response missing Id');

  const asset = await request<Record<string, unknown>>({
    auth,
    method: 'POST',
    path: '/volc/asset/CreateAsset',
    body: {
      model: assetModelForType(input.assetType),
      GroupId: groupId,
      Name: input.assetName,
      AssetType: input.assetType,
      URL: input.assetUrl
    }
  });
  const assetId = readString(asset, 'Id');
  if (!assetId) throw new Error('CIDMS asset response missing Id');
  return `asset://${assetId}`;
}

async function createVideoTask(
  auth: CidmsAuth,
  request: CidmsRequester,
  payload: Record<string, unknown>
): Promise<VideoTaskData> {
  const data = await request<Record<string, unknown>>({
    auth,
    method: 'POST',
    path: '/v1/video/generations',
    body: payload
  });
  return readVideoTask(data);
}

async function waitForVideoResult(
  auth: CidmsAuth,
  request: CidmsRequester,
  taskId: string,
  options: TalkshowRunOptions
): Promise<VideoTaskData> {
  if (!taskId) throw new Error('CIDMS video task response missing task_id');
  const maxPolls = options.maxPolls ?? 120;
  const pollIntervalMs = options.pollIntervalMs ?? 5000;

  for (let i = 0; i < maxPolls; i += 1) {
    if (pollIntervalMs > 0) await sleep(pollIntervalMs);
    const data = await request<Record<string, unknown>>({
      auth,
      method: 'GET',
      path: `/v1/video/generations/${encodeURIComponent(taskId)}`
    });
    const task = readVideoTask(data);
    if (task.result_url) return task;
    if (FAILED_STATUSES.has(task.status.toLowerCase())) {
      throw new Error(`CIDMS first 15s video failed before result_url: ${task.status || 'unknown'}`);
    }
  }

  throw new Error('CIDMS first 15s video polling timed out before result_url');
}

function appendReference(content: VideoContentPart[], url: string | undefined, role: string): void {
  const ref = clean(url);
  if (!ref) return;
  content.push({
    type: 'image_url',
    image_url: { url: ref },
    role
  });
}

function readVideoTask(data: Record<string, unknown>): VideoTaskData {
  return {
    task_id: readString(data, 'task_id') || readString(data, 'id'),
    status: readString(data, 'status'),
    progress: readNumber(data, 'progress'),
    result_url: extractVideoResultUrl(data),
    raw: data
  };
}

export function extractVideoResultUrl(data: unknown): string {
  const direct = readKnownUrlField(data);
  if (direct) return direct;

  if (Array.isArray(data)) {
    for (const item of data) {
      const nested = extractVideoResultUrl(item);
      if (nested) return nested;
    }
    return '';
  }

  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  for (const key of ['output', 'result', 'data', 'video', 'videos', 'items', 'results']) {
    const nested = extractVideoResultUrl(record[key]);
    if (nested) return nested;
  }
  return '';
}

function readKnownUrlField(data: unknown): string {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return '';
  const record = data as Record<string, unknown>;
  for (const key of ['result_url', 'video_url', 'url', 'download_url', 'output_url']) {
    const value = record[key];
    if (typeof value === 'string' && isLikelyVideoUrl(value)) return value;
  }
  return '';
}

function isLikelyVideoUrl(value: string): boolean {
  const text = value.trim();
  return /^https?:\/\//i.test(text) || text.startsWith('asset://');
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function readNumber(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
