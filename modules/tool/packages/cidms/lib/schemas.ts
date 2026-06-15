import { z } from 'zod';

export const CidmsAuthFields = z
  .object({
    seedance_api_key: z.string().max(4096).optional().default(''),
    cidms_base_url: z.preprocess((v) => {
      const s = typeof v === 'string' ? v.trim() : '';
      return s || 'https://token-gateway.clawos.metacarbon-inc.com';
    }, z.string().url().max(2048))
  })
  .superRefine((value, ctx) => {
    if (!value.seedance_api_key.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['seedance_api_key'],
        message: '请在插件系统密钥中配置 Seedance API Key'
      });
    }
  });

export type CidmsAuth = z.infer<typeof CidmsAuthFields>;
