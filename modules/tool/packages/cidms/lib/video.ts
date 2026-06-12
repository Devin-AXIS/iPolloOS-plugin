export type VideoContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; role?: string };

export function buildVideoGenerationPayload(input: {
  model: string;
  prompt: string;
  reference_url?: string;
  reference_role?: string;
  ratio?: string;
  resolution?: string;
  duration?: number;
  generate_audio?: boolean;
  callback_url?: string;
  client_reference_id?: string;
  content_json?: string;
}) {
  const content = parseContentJson(input.content_json) ?? buildVideoContent(input);

  return removeUndefined({
    model: input.model,
    content,
    generate_audio: input.generate_audio,
    ratio: input.ratio,
    resolution: input.resolution,
    duration: input.duration,
    callback_url: clean(input.callback_url),
    client_reference_id: clean(input.client_reference_id)
  });
}

export function buildVideoContent(input: {
  prompt: string;
  reference_url?: string;
  reference_role?: string;
}): VideoContentPart[] {
  const content: VideoContentPart[] = [{ type: 'text', text: input.prompt }];
  const ref = clean(input.reference_url);
  if (ref) {
    content.push({
      type: 'image_url',
      image_url: { url: ref },
      role: clean(input.reference_role) || 'reference_image'
    });
  }
  return content;
}

export function parseContentJson(contentJson?: string): VideoContentPart[] | null {
  const raw = clean(contentJson);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('content_json 必须是 content 数组 JSON');
  }
  return parsed as VideoContentPart[];
}

export function assetModelForType(assetType: 'Image' | 'Video' | 'Audio'): string {
  if (assetType === 'Video') return 'volc-asset-video';
  if (assetType === 'Audio') return 'volc-asset-audio';
  return 'volc-asset';
}

export function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined || obj[key] === '') {
      delete obj[key];
    }
  }
  return obj;
}
