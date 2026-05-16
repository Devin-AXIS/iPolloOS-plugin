import { z } from 'zod';

/** 运行时常由工具集密钥注入，单项里也可留空 */
export const SecretsOptional = z.object({
  aliyunAccessKeyId: z.string().optional(),
  aliyunAccessKeySecret: z.string().optional(),
  defaultRegionId: z.string().optional()
});

export type AlicloudAuthIn = z.infer<typeof SecretsOptional>;

export type ResolvedAuth = {
  aliyunAccessKeyId: string;
  aliyunAccessKeySecret: string;
  defaultRegionId?: string;
};

export function requireSecrets(p: AlicloudAuthIn): ResolvedAuth {
  const id = p.aliyunAccessKeyId?.trim();
  const sec = p.aliyunAccessKeySecret?.trim();
  if (!id || !sec) {
    throw new Error('缺少 RAM AccessKey，请在工具集「插件密钥」中配置。');
  }
  const d = p.defaultRegionId?.trim();
  return {
    aliyunAccessKeyId: id,
    aliyunAccessKeySecret: sec,
    ...(d ? { defaultRegionId: d } : {})
  };
}
