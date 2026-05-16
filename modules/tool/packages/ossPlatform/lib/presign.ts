import type OSS from 'ali-oss';

export type PresignPutOptions = {
  contentType?: string;
  extraSignedHeaders?: Record<string, string>;
};

/**
 * 生成 PUT 预签名 URL，并返回 **必须与请求一并发送** 的 Header（V4 含全部参与签名的头；V1 仅 Content-Type）。
 */
export async function presignPutRequest(
  client: OSS,
  key: string,
  expiresSeconds: number,
  opts?: PresignPutOptions
): Promise<{ url: string; headers: Record<string, string> }> {
  const headers: Record<string, string> = {};
  if (opts?.contentType) headers['Content-Type'] = opts.contentType;
  if (opts?.extraSignedHeaders) {
    for (const [k, v] of Object.entries(opts.extraSignedHeaders)) {
      if (v !== undefined && v !== '') headers[k] = v;
    }
  }

  const signer = client as OSS & {
    signatureUrlV4?: (
      method: string,
      expires: number,
      req: { headers: Record<string, string> },
      objectKey: string
    ) => Promise<string>;
  };

  if (typeof signer.signatureUrlV4 === 'function') {
    const url = await signer.signatureUrlV4('PUT', expiresSeconds, { headers }, key);
    return { url, headers };
  }

  const url = client.signatureUrl(key, {
    method: 'PUT',
    expires: expiresSeconds,
    ...(opts?.contentType ? { 'Content-Type': opts.contentType } : {})
  });
  const fetchHeaders: Record<string, string> = {};
  if (opts?.contentType) fetchHeaders['Content-Type'] = opts.contentType;
  return { url, headers: fetchHeaders };
}

export async function presignPut(
  client: OSS,
  key: string,
  expiresSeconds: number,
  contentType?: string,
  extraSignedHeaders?: Record<string, string>
): Promise<string> {
  const { url } = await presignPutRequest(client, key, expiresSeconds, {
    contentType,
    extraSignedHeaders
  });
  return url;
}

export function presignGet(
  client: OSS,
  key: string,
  expiresSeconds: number,
  opts?: { disposition?: 'inline' | 'attachment'; filenameAscii?: string; contentType?: string }
): string {
  const extra: Parameters<OSS['signatureUrl']>[1] = {
    method: 'GET',
    expires: expiresSeconds
  };

  let cd: string | undefined;
  if (opts?.disposition === 'attachment') {
    const name = (opts.filenameAscii || 'download').replace(/[^\x20-\x7E]/g, '_');
    cd = `attachment; filename="${name}"`;
  } else if (opts?.disposition === 'inline') {
    cd = 'inline';
  }

  if (opts?.contentType || cd) {
    extra.response = {
      ...(opts?.contentType ? { 'content-type': opts.contentType } : {}),
      ...(cd ? { 'content-disposition': cd } : {})
    };
  }

  return client.signatureUrl(key, extra);
}
