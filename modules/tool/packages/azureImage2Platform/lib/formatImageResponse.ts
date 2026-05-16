export type ImageGenOut = {
  markdown_image: string;
  image_data_url: string;
  all_image_data_urls_json: string;
  mime_type: string;
  raw_b64: string;
  image_url: string;
  minimal_json: string;
};

export function mimeForFormat(f: 'png' | 'jpeg' | 'webp'): string {
  if (f === 'png') return 'image/png';
  if (f === 'jpeg') return 'image/jpeg';
  return 'image/webp';
}

export function formatImageApiData(
  json: unknown,
  output_format: 'png' | 'jpeg' | 'webp',
  minimalPayload: Record<string, unknown>
): ImageGenOut | { system_error: string } {
  const dataArr = (json as { data?: unknown }).data;
  if (!Array.isArray(dataArr) || dataArr.length === 0) {
    return {
      system_error: `Azure 返回无图片数据：${JSON.stringify(json).slice(0, 1200)}`
    };
  }

  const mime = mimeForFormat(output_format);
  const mdLines: string[] = [];
  const payloadUrls: string[] = [];
  let firstDataUrl = '';
  let firstB64 = '';
  let firstHttpUrl = '';

  for (let i = 0; i < dataArr.length; i++) {
    const row = dataArr[i] as { b64_json?: string; url?: string };
    const rawB64 = typeof row.b64_json === 'string' ? row.b64_json : '';
    const imageUrl = typeof row.url === 'string' ? row.url : '';

    if (!rawB64 && !imageUrl) {
      return {
        system_error: `第 ${i + 1} 张图缺少 b64_json 与 url：${JSON.stringify(row).slice(0, 600)}`
      };
    }

    if (rawB64) {
      const du = `data:${mime};base64,${rawB64}`;
      payloadUrls.push(du);
      mdLines.push(`![generated-${i + 1}](${du})`);
      if (!firstDataUrl) {
        firstDataUrl = du;
        firstB64 = rawB64;
      }
    } else {
      payloadUrls.push(imageUrl);
      mdLines.push(`![generated-${i + 1}](${imageUrl})`);
      if (!firstHttpUrl) {
        firstHttpUrl = imageUrl;
      }
    }
  }

  const minimal_payload = {
    ...minimalPayload,
    n_returned: dataArr.length,
    has_b64: Boolean(firstB64),
    has_url: Boolean(firstHttpUrl)
  };

  return {
    markdown_image: mdLines.join('\n\n'),
    image_data_url: firstDataUrl || firstHttpUrl || '',
    all_image_data_urls_json: JSON.stringify(payloadUrls),
    mime_type: firstB64 ? mime : '',
    raw_b64: firstB64,
    image_url: firstHttpUrl,
    minimal_json: JSON.stringify(minimal_payload)
  };
}
