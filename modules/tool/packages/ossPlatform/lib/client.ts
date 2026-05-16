import OSS from 'ali-oss';
import { z } from 'zod';

export const OssAuthFields = z.object({
  aliyunAccessKeyId: z.string().min(1),
  aliyunAccessKeySecret: z.string().min(1),
  ossRegion: z.string().min(1),
  ossBucket: z.string().min(1),
  ossEndpoint: z.string().optional(),
  ossPublicBaseUrl: z.string().optional(),
  ossInternal: z.union([z.boolean(), z.string()]).optional(),
  ossUseCname: z.union([z.boolean(), z.string()]).optional(),
  ossSecure: z.union([z.boolean(), z.string()]).optional()
});

export type OssAuthFieldsIn = z.infer<typeof OssAuthFields>;

function truthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'yes';
  return false;
}

export function createOssClient(auth: OssAuthFieldsIn): OSS {
  const secure = auth.ossSecure === undefined ? true : truthy(auth.ossSecure);
  return new OSS({
    accessKeyId: auth.aliyunAccessKeyId,
    accessKeySecret: auth.aliyunAccessKeySecret,
    region: auth.ossRegion,
    bucket: auth.ossBucket,
    endpoint: auth.ossEndpoint?.trim() || undefined,
    internal: truthy(auth.ossInternal),
    secure,
    cname: truthy(auth.ossUseCname)
  });
}
