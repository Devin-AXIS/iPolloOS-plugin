export type CidmsImagePayload = {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: string;
  output_format?: string;
};

export function buildOpenAiImagePayload(input: {
  model: string;
  prompt: string;
  size?: string;
  quality?: string;
  output_format?: string;
}): CidmsImagePayload {
  return {
    model: input.model,
    prompt: input.prompt,
    n: 1,
    size: input.size,
    quality: input.quality,
    output_format: input.output_format
  };
}

export function buildGeminiImagePayload(input: {
  prompt: string;
  aspect_ratio?: string;
  image_size?: string;
}) {
  const imageConfig: Record<string, string> = {};
  if (input.aspect_ratio) imageConfig.aspectRatio = input.aspect_ratio;
  if (input.image_size) imageConfig.imageSize = input.image_size;

  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: input.prompt }]
      }
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig
    }
  };
}

export function isGeminiImageModel(model: string): boolean {
  return model.startsWith('gemini-');
}

export function firstOpenAiImageBase64(data: unknown): { base64: string; mimeType: string } | null {
  if (!data || typeof data !== 'object') return null;
  const arr = (data as Record<string, unknown>).data;
  if (!Array.isArray(arr)) return null;
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const b64 = (item as Record<string, unknown>).b64_json;
    if (typeof b64 === 'string' && b64.length > 0) {
      return { base64: b64, mimeType: 'image/png' };
    }
  }
  return null;
}

export function firstGeminiInlineImage(data: unknown): {
  base64: string;
  mimeType: string;
  text: string;
} | null {
  const textParts: string[] = [];
  if (!data || typeof data !== 'object') return null;
  const candidates = (data as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates)) return null;

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== 'object') continue;
    const parts = (content as Record<string, unknown>).parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      if (!part || typeof part !== 'object') continue;
      const p = part as Record<string, unknown>;
      if (typeof p.text === 'string') textParts.push(p.text);
      const inlineData = p.inlineData;
      if (inlineData && typeof inlineData === 'object') {
        const img = inlineData as Record<string, unknown>;
        const base64 = img.data;
        const mimeType = img.mimeType;
        if (typeof base64 === 'string' && typeof mimeType === 'string') {
          return { base64, mimeType, text: textParts.join('\n') };
        }
      }
    }
  }

  return null;
}
